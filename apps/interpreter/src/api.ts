// This file creates and exports a single ToolboxApi instance using the base URL from the environment.
import { ToolboxApi } from 'toolbox-api';

const apiBaseUrl = process.env.TOOLBOX_API_URL;
if (!apiBaseUrl) {
  throw new Error('TOOLBOX_API_URL environment variable is not set');
}
export const toolboxApi = new ToolboxApi(apiBaseUrl);

toolboxApi.initialize();
