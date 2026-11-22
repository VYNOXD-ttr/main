import {
  handleHealthRequest,
  type GenericApiRequest,
  type GenericApiResponse,
} from "../server/assistantCore.ts";

export default function handler(
  _req: GenericApiRequest,
  res: GenericApiResponse,
): void {
  handleHealthRequest(res);
}
