<template>
  <div class="min-h-screen bg-app-bg">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
      <div class="max-w-screen-2xl mx-auto px-6 py-4">
        <div class="flex items-center gap-3">
          <img src="https://langium.org/assets/langium_logo_w_nib.svg" alt="Langium" class="h-8" />
          <h1 class="text-xl font-semibold text-app-text">Meta Solver Strategy Editor</h1>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="max-w-screen-2xl mx-auto h-[calc(100vh-73px)] flex">
      <!-- Sidebar -->
      <aside class="w-96 bg-white border-r border-app-border p-6 overflow-y-auto">
        <ProblemTypeSelector
          :problem-types="problemTypes"
          :counts-by-type="countsByType"
          :selected-type="selectedProblemType"
          @select="onProblemTypeSelect"
        />

        <StrategyList
          :strategies="displayedStrategies"
          :selected-id="selectedStrategyId"
          :selected-type="selectedProblemType"
          @select="selectStrategy"
          @delete="deleteStrategy"
          @new="createNewStrategy"
        />

        <div class="mt-6 space-y-4">
          <div class="text-sm text-app-muted">
            <div class="font-medium text-app-text mb-1">Note</div>
            <p>Select a problem type, then choose an existing strategy or create a new one to edit and save.</p>
          </div>
          <div class="text-sm text-app-muted">
            <div class="font-medium text-app-text mb-1">Hint</div>
            <p>Press Ctrl+Space inside the editor to trigger code completion.</p>
          </div>
        </div>
      </aside>

      <!-- Main Editor Area -->
      <main class="flex-1 flex flex-col p-6 bg-app-bg">
        <EditorToolbar
          v-model:name="strategyName"
          :status="statusMessage"
          @save="saveStrategy"
        />

        <div class="flex-1 bg-white rounded-lg shadow-card border border-app-border flex flex-col">
          <div id="monaco-editor-root" class="flex-1"></div>
          <div class="px-4 py-2 bg-gray-50 border-t border-app-border text-sm text-app-muted">
            {{ statusMessage }}
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ProblemTypeSelector from './components/ProblemTypeSelector.vue';
import StrategyList from './components/StrategyList.vue';
import EditorToolbar from './components/EditorToolbar.vue';
import { configureMonacoWorkers } from './editor/setupCommon';
import { executeExtended } from './editor/setupExtended';
import { toolboxApi } from './api';
import { strategyApi, type Strategy } from './services/strategyApi';

interface ProblemType {
  id: string;
  description?: string;
}

const problemTypes = ref<ProblemType[]>([]);
const allStrategies = ref<Strategy[]>([]);
const displayedStrategies = ref<Strategy[]>([]);
const countsByType = ref<Record<string, number>>({});
const selectedProblemType = ref('');
const selectedStrategyId = ref<string | null>(null);
const strategyName = ref('');
const statusMessage = ref('Initializing editor...');

let editorWrapper: any = null;


const defaultCodeTemplate = `solve {type} {type-var}:
  // implement strategy for {type}`;

async function refreshProblemTypes() {
  try {
    const types = await toolboxApi.getProblemTypes();
    if (Array.isArray(types)) {
      problemTypes.value = types;
    }
  } catch (err) {
    console.warn('Could not fetch problem types from toolboxApi:', err);
    problemTypes.value = [];
  }
}

async function refreshStrategies() {
  try {
    allStrategies.value = await strategyApi.listAllStrategies();

    if (selectedProblemType.value) {
      displayedStrategies.value = await strategyApi.listStrategies(selectedProblemType.value);
    } else {
      displayedStrategies.value = [];
    }

    // Update counts
    countsByType.value = allStrategies.value.reduce((acc, s) => {
      const id = s.problemTypeId || '';
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  } catch (err: any) {
    statusMessage.value = 'Failed to load strategies: ' + err.message;
  }
}

function onProblemTypeSelect(typeId: string) {
  selectedProblemType.value = typeId;
  refreshStrategies();
}

async function selectStrategy(id: string) {
  selectedStrategyId.value = id;
  statusMessage.value = 'Loading strategy...';
  try {
    const strategy = await strategyApi.getStrategy(id);
    strategyName.value = strategy.name || '';
    if (editorWrapper) {
      editorWrapper.getEditor().setValue(strategy.code || '');
    }
    statusMessage.value = `Loaded strategy "${strategy.name || strategy.id}"`;
  } catch (err: any) {
    statusMessage.value = 'Failed to load strategy: ' + err.message;
  }
}

async function deleteStrategy(id: string, name: string) {
  if (!globalThis.confirm(`Delete strategy "${name || id}"?`)) return;

  statusMessage.value = 'Deleting...';
  try {
    await strategyApi.deleteStrategy(id);
    if (selectedStrategyId.value === id) {
      selectedStrategyId.value = null;
      strategyName.value = '';
      if (editorWrapper) {
        editorWrapper.getEditor().setValue('');
      }
    }
    await refreshStrategies();
    statusMessage.value = `Deleted ${name || id}`;
  } catch (err: any) {
    statusMessage.value = 'Delete failed: ' + err.message;
  }
}

function createNewStrategy() {
  let type = selectedProblemType.value;

  if (!type) {
    if (problemTypes.value.length === 0) {
      statusMessage.value = 'No problem types available';
      return;
    }
    type = problemTypes.value[0].id;
    selectedProblemType.value = type;
    refreshStrategies();
  }

  selectedStrategyId.value = null;
  strategyName.value = '';

  const generated = defaultCodeTemplate
    .replaceAll('{type}', type)
    .replaceAll('{type-var}', type.toLowerCase());

  if (editorWrapper) {
    editorWrapper.getEditor().setValue(generated);
    statusMessage.value = `Editing new strategy for ${type}`;
  } else {
    statusMessage.value = 'Editor not ready';
  }
}

async function saveStrategy() {
  const name = strategyName.value?.trim();
  const code = editorWrapper ? editorWrapper.getEditor().getValue() : '';

  if (!code) {
    statusMessage.value = 'Cannot save empty code';
    return;
  }
  if (!name) {
    statusMessage.value = 'Please provide a name';
    return;
  }

  statusMessage.value = 'Saving...';
  try {
    if (selectedStrategyId.value) {
      const updated = await strategyApi.updateStrategy(selectedStrategyId.value, { name, code });
      statusMessage.value = `Saved "${updated.name}"`;
    } else {
      const created = await strategyApi.createStrategy({ name, code });
      selectedStrategyId.value = created.id;
      statusMessage.value = `Created "${created.name}"`;
    }
    await refreshStrategies();
  } catch (err: any) {
    statusMessage.value = 'Save failed: ' + err.message;
  }
}

onMounted(async () => {
  configureMonacoWorkers();

  const editorRoot = document.getElementById('monaco-editor-root');
  if (editorRoot) {
    editorWrapper = await executeExtended(editorRoot);
    statusMessage.value = 'Editor ready';
  }

  await refreshStrategies();
  await refreshProblemTypes();
});
</script>
