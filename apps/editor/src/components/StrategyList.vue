<template>
  <div class="mb-6">
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm font-semibold text-app-text">Strategies</span>
      <button
        @click="emit('new')"
        class="px-3 py-1.5 text-sm font-medium text-white bg-app-accent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-1 transition"
      >
        New
      </button>
    </div>

    <div class="space-y-2">
      <div v-if="!selectedType" class="text-sm text-app-muted py-4 text-center bg-gray-50 rounded-lg border border-app-border">
        Select a problem type to list strategies
      </div>

      <div v-else-if="filteredStrategies.length === 0" class="text-sm text-app-muted py-4 text-center bg-gray-50 rounded-lg border border-app-border">
        No strategies for this problem type
      </div>

      <div
        v-for="strategy in filteredStrategies"
        :key="strategy.id"
        class="group relative flex items-center justify-between p-3 bg-white border rounded-lg hover:border-blue-300 hover:shadow-sm cursor-pointer transition"
        :class="{
          'border-blue-300 bg-blue-400': strategy.id === selectedId,
          'border-app-border': strategy.id !== selectedId
        }"
        @click="emit('select', strategy.id)"
      >
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-app-text truncate">
            {{ strategy.name || '(unnamed)' }}
          </div>
          <div class="text-xs text-app-muted truncate">
            {{ strategy.problemTypeId }}
          </div>
        </div>

        <button
          @click.stop="handleDelete(strategy)"
          class="ml-2 px-2 py-1 text-xs font-medium text-app-danger hover:text-red-700 hover:bg-red-50 rounded transition opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-app-danger"
          title="Delete strategy"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Strategy {
  id: string;
  name: string;
  code: string;
  problemTypeId: string;
}

interface Props {
  strategies: Strategy[];
  selectedId: string | null;
  selectedType: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  select: [id: string];
  delete: [id: string, name: string];
  new: [];
}>();

const filteredStrategies = computed(() => {
  if (!props.selectedType) return [];
  return props.strategies.filter(s => s.problemTypeId === props.selectedType);
});

function handleDelete(strategy: Strategy) {
  emit('delete', strategy.id, strategy.name);
}
</script>
