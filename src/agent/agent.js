import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import tools from "./tools.js";
import { ToolMessage, AIMessage, HumanMessage } from "@langchain/core/messages";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  temperature: 0.5,
});

const isFindAndAddToCartIntent = (message) => {
  const text = message.content.toLowerCase();
  return (
    (text.includes("find") || text.includes("search")) &&
    (text.includes("add to cart") || text.includes("add it"))
  );
};

const graph = new StateGraph(MessagesAnnotation)
  .addNode("tools", async (state, config) => {
    const lastMessage = state.messages[state.messages.length - 1];

    const toolsCall = lastMessage.tool_calls;

    const toolCallResults = await Promise.all(
      toolsCall.map(async (call) => {
        const tool = tools[call.name];
        if (!tool) {
          throw new Error(`Tool ${call.name} not found`);
        }
        const toolInput = call.args;

        const toolResult = await tool.func({
          ...toolInput,
          token: config.metadata.token,
        });

        return new ToolMessage({
          content: toolResult,
          name: call.name,
          tool_call_id: call.id,
        });
      })
    );
    state.messages.push(...toolCallResults);

    return state;
  })
  .addNode("auto_add_to_cart", async (state, config) => {
    const lastMessage = state.messages[state.messages.length - 1];
    const userQuery = lastMessage.content
      .toLowerCase()
      .split(" and ")[0]
      .replace(/(find|search\s+for)\s*/, "")
      .trim();

    const searchResult = await tools.searchProduct.func({
      query: userQuery,
      token: config.metadata.token,
    });
    const products = JSON.parse(searchResult);

    if (products.length > 0) {
      const bestProduct = products[0];
      const productId = bestProduct.id;
      const productName = bestProduct.name;

      const addResult = await tools.addProductToCart.func({
        productId,
        qty: 1,
        token: config.metadata.token,
      });
      const resultData = JSON.parse(addResult);

      let finalMessage;
      if (resultData.success) {
        finalMessage = `✅ **${productName}** has been successfully added to your cart.`;
      } else {
        finalMessage = `⚠️ I found **${productName}**, but there was an error adding it to the cart: ${resultData.error}`;
      }

      state.messages.push(new AIMessage({ content: finalMessage }));
    } else {
      state.messages.push(
        new AIMessage({
          content: `I couldn't find any products matching "${userQuery}". Could you be more specific?`,
        })
      );
    }

    return state;
  })
  .addNode("chat", async (state, config) => {
    const response = await model.invoke(state.messages, {
      tools: [tools.searchProduct, tools.addProductToCart],
    });

    state.messages.push(
      new AIMessage({ content: response.text, tool_calls: response.tool_calls })
    );

    return state;
  })
  .addConditionalEdges("__start__", (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (isFindAndAddToCartIntent(lastMessage)) {
      return "auto_add_to_cart";
    }
    return "chat";
  })
  .addEdge("auto_add_to_cart", "__end__")
  .addConditionalEdges("chat", async (state) => {
    const lastMessage = state.messages[state.messages.length - 1];

    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      return "tools";
    } else {
      return "__end__";
    }
  })
  .addEdge("tools", "chat");

const agent = graph.compile();

export default agent;
