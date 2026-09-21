// This file creates and exports a single ToolboxApi instance using the base URL from the environment.
import { ToolboxApi } from 'toolbox-api';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const interpreterBaseUrl = import.meta.env.VITE_URL_INTERPRETER;
export const toolboxApi = new ToolboxApi(apiBaseUrl, interpreterBaseUrl);

toolboxApi.initialize();
