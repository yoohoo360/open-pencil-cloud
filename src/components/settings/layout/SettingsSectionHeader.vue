<template>
  <div>
    <h3 class="text-xs font-semibold text-surface"><slot /></h3>
    <p v-if="$slots.description" class="mt-1 text-[11px] text-muted">
      <slot name="description" />
    </p>
  </div>
</template>
