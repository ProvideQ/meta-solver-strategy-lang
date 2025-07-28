// This file creates and exports a single ToolboxApi instance using the base URL from the environment.
import { ToolboxApi } from 'toolbox-api';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
export const toolboxApi = new ToolboxApi(apiBaseUrl);

toolboxApi.initialize();
