<template>
  <div class="mb-6">
    <span class="block text-sm font-semibold text-app-text mb-2">Problem Type</span>
    <div class="relative">
      <button
        ref="buttonRef"
        type="button"
        @click="toggleDropdown"
        @keydown="handleButtonKeydown"
        class="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-app-border rounded-lg hover:shadow-sm transition"
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
      >
        <span class="flex items-center gap-2">
          <span
            v-if="selectedType"
            class="inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full"
            :class="selectedCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-app-muted'"
          >
            {{ selectedCount }}
          </span>
          <span class="text-app-text">{{ selectedLabel }}</span>
        </span>
        <svg class="w-5 h-5 text-gray-400 transition-transform" :class="{ 'rotate-180': isOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Dropdown Menu -->
      <transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <div
          v-show="isOpen"
          class="absolute z-10 w-full mt-2 bg-white border border-app-border rounded-lg shadow-lg max-h-64 overflow-auto"
          role="listbox"
          @keydown="handleListKeydown"
        >
          <div
            v-for="(type, index) in problemTypes"
            :key="type.id"
            ref="itemRefs"
            role="option"
            :aria-selected="type.id === selectedType"
            tabindex="0"
            class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition"
            :class="{
              'bg-blue-50': focusedIndex === index,
              'bg-blue-100': type.id === selectedType
            }"
            @click="selectType(type.id)"
            @keydown.enter.prevent="selectType(type.id)"
            @keydown.space.prevent="selectType(type.id)"
          >
            <span
              class="inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full flex-shrink-0"
              :class="(countsByType[type.id] || 0) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-app-muted'"
            >
              {{ countsByType[type.id] || 0 }}
            </span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-app-text">{{ type.id }}</div>
              <div v-if="type.description" class="text-xs text-app-muted truncate">{{ type.description }}</div>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <div v-if="selectedType && selectedDescription" class="mt-2 text-sm text-app-muted">
      {{ selectedDescription }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

interface ProblemType {
  id: string;
  description?: string;
}

interface Props {
  problemTypes: ProblemType[];
  countsByType: Record<string, number>;
  selectedType: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  select: [typeId: string];
}>();

const isOpen = ref(false);
const focusedIndex = ref(-1);
const buttonRef = ref<HTMLButtonElement | null>(null);
const itemRefs = ref<HTMLElement[]>([]);

const selectedLabel = computed(() => {
  if (!props.selectedType) return 'Select a problem type';
  return props.selectedType;
});

const selectedCount = computed(() => {
  return props.countsByType[props.selectedType] || 0;
});

const selectedDescription = computed(() => {
  const type = props.problemTypes.find(t => t.id === props.selectedType);
  return type?.description || '';
});

function toggleDropdown() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    focusedIndex.value = props.problemTypes.findIndex(t => t.id === props.selectedType);
    if (focusedIndex.value < 0) focusedIndex.value = 0;
  }
}

function closeDropdown() {
  isOpen.value = false;
  focusedIndex.value = -1;
  buttonRef.value?.focus();
}

function selectType(typeId: string) {
  emit('select', typeId);
  closeDropdown();
}

function handleButtonKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!isOpen.value) {
      toggleDropdown();
    }
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    toggleDropdown();
  } else if (event.key === 'Escape' && isOpen.value) {
    closeDropdown();
  }
}

function handleListKeydown(event: KeyboardEvent) {
  if (!props.problemTypes.length) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    focusedIndex.value = Math.min(props.problemTypes.length - 1, focusedIndex.value + 1);
    itemRefs.value[focusedIndex.value]?.focus();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    focusedIndex.value = Math.max(0, focusedIndex.value - 1);
    itemRefs.value[focusedIndex.value]?.focus();
  } else if (event.key === 'Home') {
    event.preventDefault();
    focusedIndex.value = 0;
    itemRefs.value[0]?.focus();
  } else if (event.key === 'End') {
    event.preventDefault();
    focusedIndex.value = props.problemTypes.length - 1;
    itemRefs.value[focusedIndex.value]?.focus();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    closeDropdown();
  }
}

function handleClickOutside(event: MouseEvent) {
  if (isOpen.value && buttonRef.value && !buttonRef.value.contains(event.target as Node)) {
    const dropdown = buttonRef.value.nextElementSibling;
    if (dropdown && !dropdown.contains(event.target as Node)) {
      closeDropdown();
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Auto-select if only one type
watch(() => props.problemTypes, (types) => {
  if (types.length === 1 && !props.selectedType) {
    emit('select', types[0].id);
  }
}, { immediate: true });
</script>
