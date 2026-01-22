<template>
  <div class="flex items-center gap-3 mb-4">
    <button
      @click="emit('save')"
      class="px-4 py-2 text-sm font-medium text-white bg-app-accent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-1 transition"
    >
      Save
    </button>
    <button
      @click="emit('save:new')"
      class="px-4 py-2 text-sm font-medium text-white bg-app-accent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-1 transition"
    >
      Save as New
    </button>

    <div class="flex-1 relative">
      <input
        :value="name"
        @input="updateName"
        type="text"
        placeholder="Strategy name"
        class="w-full px-4 py-2 pr-10 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent transition"
      />
      <button
        v-show="name"
        @click="clearName"
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
        title="Clear name"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  name: string;
  status: string;
}

defineProps<Props>();
const emit = defineEmits<{
  'update:name': [value: string];
  save: [];
  'save:new': [];
}>();

function updateName(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:name', target.value);
}

function clearName() {
  emit('update:name', '');
}
</script>

