export type {
  Editor,
  EditorState,
  EditorOptions,
  EditorEvents,
  EditorEventName,
  Tool,
  EditorToolDef
} from '@open-pencil/core/editor'
export { createEditor, EDITOR_TOOLS, TOOL_SHORTCUTS } from '@open-pencil/core/editor'

/**
 * Public editor-context API for the React SDK.
 *
 * These are the primary entry points for making an editor available to a React
 * subtree and reading it back inside hooks and headless primitives.
 */
export { EditorProvider, provideEditor, useEditor, EDITOR_KEY } from '#react/editor/context'

/** Canvas and input integration composables. */
export { useCanvas } from '#react/canvas/surface/use'
export type { UseCanvasOptions } from '#react/canvas/surface/use'
export { useCanvasInput } from '#react/canvas/useCanvasInput'
export { useCanvasVirtualReference } from '#react/canvas/overlays/useCanvasVirtualReference'
export { useTextEdit } from '#react/canvas/text-edit/use'
export { useCanvasDrop, extractImageFilesFromClipboard } from '#react/canvas/drop/use'

/** Low-level selection, graph, and derived-state helpers. */
export { useNodeProps, MIXED } from '#react/controls/node-props/use'
export type { MixedValue } from '#react/controls/node-props/use'
export { useSceneComputed } from '#react/internal/scene-computed/use'
export { useSelectionState } from '#react/editor/selection-state/use'
export { useEditorEvent } from '#react/editor/events/use'
export { useSelectionCapabilities } from '#react/editor/selection-capabilities/use'

/** Command and menu composition helpers. */
export { useEditorCommands } from '#react/editor/commands/use'
export { EDITOR_COMMAND_METADATA, editorCommandMetadata } from '#react/editor/commands/registry'
export { formatShortcut, shortcutPlatform } from '#react/editor/commands/shortcut'
export type { EditorCommandMetadata } from '#react/editor/commands/registry'
export type { ShortcutPlatform } from '#react/editor/commands/shortcut'
export type { EditorCommand, EditorCommandId } from '#react/editor/commands/use'
export { useMenuModel } from '#react/editor/menu-model/use'
export type { MenuActionNode, MenuEntry, MenuSeparatorNode } from '#react/editor/menu-model/use'

/** Miscellaneous editor-shell helpers. */
export { useViewportKind } from '#react/editor/viewport-kind/use'
export { useLayerDrag } from '#react/primitives/LayerTree/useLayerDrag'
export { useFlatReorderDrag } from '#react/shared/drag/useFlatReorderDrag'
export type {
  FlatReorderAxis,
  FlatReorderInstruction,
  FlatReorderItem,
  UseFlatReorderDragOptions
} from '#react/shared/drag/useFlatReorderDrag'
export { useInlineRename } from '#react/editor/inline-rename/use'
export { useToolbarState } from '#react/primitives/Toolbar/useToolbarState'
export { useNodeFontStatus } from '#react/shared/font-status/use'
export { usePropScrub } from '#react/controls/prop-scrub/use'
export { toolCursor } from '#react/editor/tool-cursor'
export {
  acpPermissionOptionTestId,
  testId,
  testIdSelector,
  toolbarFlyoutItemTestId,
  toolbarFlyoutTestId,
  toolbarToolTestId,
  variablesAddTestId
} from '#react/testing/test-id'
export { vTestId } from '#react/testing/v-test-id'
export type { TestId } from '#react/testing/test-id'

/** Property-panel composables. */
export { usePosition } from '#react/controls/position/use'
export { useLayout } from '#react/controls/layout/use'
export type { LayoutAxis, SizeLimitProp } from '#react/controls/layout/helpers'
export { useAppearance } from '#react/controls/appearance/use'
export { useMask } from '#react/controls/mask/use'
export { useTypography } from '#react/controls/typography/use'
export type { UseTypographyOptions } from '#react/controls/typography/use'
export { useExport } from '#react/document/export/use'
export type { ExportFormatId, ExportSetting } from '#react/document/export/use'
export { useFillControls } from '#react/controls/fill/use'
export { useColorVariableBinding } from '#react/controls/color-variable-binding/use'
export { useNumberVariableBinding } from '#react/controls/number-variable-binding/use'
export type { NumberBindingPath } from '#react/controls/number-variable-binding/use'
export { useVariableBinding } from '#react/controls/variable-binding/use'
export type {
  VariableBindingState,
  UseVariableBindingOptions
} from '#react/controls/variable-binding/use'
export { useEffectsControls } from '#react/controls/effects/use'
export { useSharedStyleBinding } from '#react/controls/shared-style/use'
export { useStrokeControls } from '#react/controls/stroke/use'
export {
  applySolidFillColor,
  applySolidStrokeColor,
  BUILT_IN_COLOR_FORMATS,
  fromPercent,
  toPercent,
  useColorModel
} from '#react/controls/color-model'
export type {
  BuiltInColorFormat,
  ColorFieldFormat,
  ColorFieldOption,
  OkHCLControls,
  UseColorModelOptions
} from '#react/controls/color-model'
export { useOkHCL } from '#react/controls/okhcl/use'

/** Variables, page navigation, and picker helpers. */
export { useVariables } from '#react/variables/use'
export { useVariablesDialogState } from '#react/variables/dialog/use'
export { useVariablesEditor } from '#react/variables/editor/use'
export { useVariablesTable } from '#react/variables/table/use'
export { usePageList } from '#react/primitives/PageList/usePageList'
export {
  fillCategory,
  fillIsTransparent,
  fillSwatchBackground,
  useFill
} from '#react/primitives/Fill'
export type { FillActions, FillCategory } from '#react/primitives/Fill'
export { useGradientStops } from '#react/primitives/GradientEditor/useGradientStops'
export { useFontPicker } from '#react/primitives/FontPicker/useFontPicker'

/** Headless structural primitives and their local contexts. */
export { CanvasRoot, CanvasSurface, useCanvasContext } from '#react/canvas'
export type { CanvasContext } from '#react/canvas'
export { ColorInputRoot, ColorPickerRoot } from '#react/primitives/ColorPicker'
export {
  ChannelSliderRoot,
  ChannelSliderThumb,
  ChannelSliderTrack
} from '#react/primitives/ChannelSlider'
export type {
  ChannelSliderOrientation,
  ChannelSliderPartProps,
  ChannelSliderRootProps,
  ChannelSliderRootSlotProps,
  ChannelSliderThumbSlotProps
} from '#react/primitives/ChannelSlider'
export { FillRoot, FillSwatch } from '#react/primitives/Fill'
export type {
  FillRootSlotProps,
  FillRootSlots,
  FillSwatchProps,
  FillSwatchSlotProps,
  FillSwatchSlots
} from '#react/primitives/Fill'
export { FontPickerRoot } from '#react/primitives/FontPicker'
export type { FontFamilyOption, FontPickerUI } from '#react/primitives/FontPicker'
export {
  GradientEditorRoot,
  GradientEditorBar,
  GradientEditorStop
} from '#react/primitives/GradientEditor'
export type {
  GradientEditorStopActions,
  GradientEditorStopProps,
  GradientEditorStopSlotProps,
  GradientEditorStopSlots
} from '#react/primitives/GradientEditor'
export {
  buildLayerTreeModel,
  indexLayerNodes,
  layerSelectionForTarget,
  LayerTreeItem,
  LayerTreeRoot,
  patchLayerNode,
  useLayerTree,
  visibleLayerRows
} from '#react/primitives/LayerTree'
export type {
  LayerDragInstruction,
  LayerNode,
  LayerRow,
  LayerSelectionMode,
  LayerTreeContext,
  LayerTreeVirtualizer
} from '#react/primitives/LayerTree'
export { LayoutControlsRoot, useLayoutControlsContext } from '#react/primitives/LayoutControls'
export type {
  LayoutControlsContext,
  LayoutControlsRootSlotProps,
  LayoutControlsRootSlots
} from '#react/primitives/LayoutControls'
export { AppearanceControlsRoot } from '#react/primitives/AppearanceControls'
export type {
  AppearanceControlsActions,
  AppearanceControlsRootSlotProps,
  AppearanceControlsRootSlots
} from '#react/primitives/AppearanceControls'
export { ConstraintsControlRoot } from '#react/primitives/ConstraintsControl'
export type {
  ConstraintsControlActions,
  ConstraintsControlRootSlotProps,
  ConstraintsControlRootSlots
} from '#react/primitives/ConstraintsControl'
export {
  constraintPins,
  isConstraintEligible,
  toggleConstraintPin,
  useConstraints
} from '#react/controls/constraints'
export type { ConstraintAxis, ConstraintEdge, ConstraintValue } from '#react/controls/constraints'
export {
  compatibleComponentPropertyDefinitions,
  instanceSwapOptions,
  mergedComponentPropertyValue,
  useComponentProperties
} from '#react/controls/component-props'
export type {
  ComponentPropertyControl,
  ComponentPropertyOption
} from '#react/controls/component-props'
export type { CornerGeometryKey, CornerRadiusKey } from '#react/controls/appearance/types'
export { PageListRoot } from '#react/primitives/PageList'
export { PositionControlsRoot } from '#react/primitives/PositionControls'
export { useEditorPropertyList } from '#react/controls/property-list'
export {
  PropertyListRoot,
  PropertyListItem,
  PropertyListAdd,
  PropertyListRemove,
  PropertyListVisibility,
  usePropertyList
} from '#react/primitives/PropertyList'
export type {
  PropertyListActions,
  PropertyListContext,
  PropertyListIdentity,
  PropertyListItemActions,
  PropertyListItemFor,
  PropertyListItemMap,
  PropertyListItemSlotProps,
  PropertyListKey,
  PropertyListPartProps,
  PropertyListPatchFor,
  PropertyListRootProps,
  PropertyListRootSlotProps,
  PropertyListRootSlots
} from '#react/primitives/PropertyList'
export {
  PropertySectionRoot,
  PropertySectionHeader,
  PropertySectionTitle,
  PropertySectionActions,
  PropertySectionContent,
  PropertySectionEmptyAction,
  usePropertySection
} from '#react/primitives/PropertySection'
export type {
  PropertySectionActionAPI,
  PropertySectionContext,
  PropertySectionPartProps,
  PropertySectionRootProps,
  PropertySectionSlotProps,
  PropertySectionStateAttrs
} from '#react/primitives/PropertySection'
export {
  SegmentedControlRoot,
  SegmentedControlItem,
  useSegmentedControl
} from '#react/primitives/SegmentedControl'
export type {
  SegmentedControlContext,
  SegmentedControlItemProps,
  SegmentedControlItemSlotProps,
  SegmentedControlMode,
  SegmentedControlOrientation,
  SegmentedControlRootProps
} from '#react/primitives/SegmentedControl'
export {
  BindableValueRoot,
  BindableValueTrigger,
  BindableValuePicker,
  useBindableValue,
  useOptionalBindableValue
} from '#react/primitives/BindableValue'
export type {
  BindableValueActions,
  BindableValueContext,
  BindableValueRootProps,
  BindableValueRootSlots,
  BindableValueSlotProps,
  BindableValueStateAttrs,
  BindableValueTriggerProps
} from '#react/primitives/BindableValue'
export {
  provideBindingProvider,
  useBindingProvider,
  useOpenPencilBindingProvider,
  useNumberBindingProvider,
  useColorBindingProvider
} from '#react/controls/binding-provider'
export type {
  BindingMutationSource,
  BindingProvider,
  BindingState,
  BindingTarget,
  BoundEditPolicy,
  OpenPencilBindingProviderOptions
} from '#react/controls/binding-provider'
export {
  NumberFieldRoot,
  NumberFieldInput,
  NumberFieldValue,
  NumberFieldLeading,
  NumberFieldUnit,
  NumberFieldTrailing,
  NumberFieldMenu,
  useNumberField
} from '#react/primitives/NumberField'
export type {
  NumberFieldActions,
  NumberFieldContext,
  NumberFieldEditPolicy,
  NumberFieldMutationSource,
  NumberFieldRootAttrs,
  NumberFieldRootEmits,
  NumberFieldRootProps,
  NumberFieldRootSlots,
  NumberFieldSlotProps,
  NumberFieldState,
  NumberFieldStateAttrs,
  NumberFieldValueSlots
} from '#react/primitives/NumberField'
export {
  clampNumberValue,
  evaluateNumberExpression,
  normalizeNumberValue,
  stepNumberValue
} from '#react/controls/number-expression'
export type {
  NumberExpressionError,
  NumberExpressionOptions,
  NumberExpressionResult
} from '#react/controls/number-expression'
export { TypographyControlsRoot } from '#react/primitives/TypographyControls'
export { ToolbarRoot, ToolbarItem, useToolbar } from '#react/primitives/Toolbar'
export type { ToolbarContext } from '#react/primitives/Toolbar'

/** DOM event helpers for cast-free template bindings. */
export { blurTarget, inputNumberValue, inputValue, selectTarget } from '#react/shared/dom-events'

/** Internationalization. */
export {
  useI18n,
  useI18nNamespace,
  useMenuMessages,
  useCommandMessages,
  useToolMessages,
  usePanelMessages,
  useVariableTypeMessages,
  usePageMessages,
  useDialogMessages,
  i18n
} from '#react/i18n'
export {
  locale,
  localeSetting,
  setLocale,
  AVAILABLE_LOCALES,
  TRANSLATED_LOCALES,
  LOCALE_DIR_NAMES,
  LOCALE_LABELS
} from '#react/i18n'
export type { Locale, TranslatedLocale } from '#react/i18n'
export {
  menuMessages,
  commandMessages,
  toolMessages,
  panelMessages,
  variableTypeMessages,
  pageMessages,
  dialogMessages,
  messageDefaults
} from '#react/i18n'
