import {
  handleAssistantChatRequest,
  type GenericApiRequest,
  type GenericApiResponse,
} from "../../server/assistantCore.ts";

export default async function handler(
  req: GenericApiRequest,
  res: GenericApiResponse,
): Promise<void> {
  await handleAssistantChatRequest(req, res);
}
