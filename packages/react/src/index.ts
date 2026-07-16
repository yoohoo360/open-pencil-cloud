export type {
  Editor,
  EditorState,
  EditorOptions,
  Tool,
  EditorToolDef
} from '@open-pencil/core/editor'
export { createEditor, EDITOR_TOOLS, TOOL_SHORTCUTS } from '@open-pencil/core/editor'

/**
 * Public editor-context API for the React SDK.
 */
export {
  EditorProvider,
  createEditorStore,
  useEditor,
  useEditorVersion,
  useEditorNotify,
  useEditorSelector,
  EDITOR_KEY
} from './context/editorContext'
export type { EditorStore } from './context/editorContext'

/** Canvas and input integration hooks. */
export { useCanvas } from './shared/useCanvas'
export type { UseCanvasOptions } from './shared/useCanvas'
export { useCanvasInput } from './Canvas/useCanvasInput'
export { useTextEdit } from './Canvas/useTextEdit'
export { useCanvasDrop, extractImageFilesFromClipboard } from './Canvas/useCanvasDrop'

/** Low-level selection, graph, and derived-state helpers. */
export { useNodeProps, MIXED } from './controls/useNodeProps'
export type { MixedValue } from './controls/useNodeProps'
export { useSceneComputed } from './internal/useSceneComputed'
export { useSelectionState } from './selection/useSelectionState'
export { useSelectionCapabilities } from './selection/useSelectionCapabilities'
export { usePropScrub } from './controls/usePropScrub'
export { toolCursor } from './internal/toolCursor'
export { useNodeFontStatus } from './shared/useFontStatus'
export { useInlineRename } from './shared/useInlineRename'

/** Command and menu composition helpers. */
export { useEditorCommands } from './commands/useEditorCommands'
export type { EditorCommand, EditorCommandId } from './commands/useEditorCommands'
export { useMenuModel } from './commands/useMenuModel'
export type { MenuEntry } from './commands/useMenuModel'

/** Property-panel hooks. */
export { usePosition } from './controls/usePosition'
export { useLayout } from './controls/useLayout'
export { useAppearance } from './controls/useAppearance'
export { useTypography } from './controls/useTypography'
export type { UseTypographyOptions } from './controls/useTypography'
export { useExport } from './controls/useExport'
export { useFillControls } from './controls/useFillControls'
export { useColorVariableBinding } from './controls/useColorVariableBinding'
export { useEffectsControls } from './controls/useEffectsControls'
export { useStrokeControls } from './controls/useStrokeControls'
export { useOkHCL } from './controls/useOkHCL'

/** Variables, page navigation, and picker helpers. */
export { useVariables } from './VariablesEditor/useVariables'
export { useVariablesDialogState } from './VariablesEditor/useVariablesDialogState'
export { usePageList } from './PageList/usePageList'
export { useFillPicker } from './FillPicker/useFillPicker'
export { useGradientStops } from './GradientEditor/useGradientStops'
export { useFontPicker } from './FontPicker/useFontPicker'
export type { UseFontPickerOptions } from './FontPicker/useFontPicker'
export { useToolbarState } from './Toolbar/useToolbarState'
export { useLayerDrag, useLayerDragItem } from './LayerTree/useLayerDrag'
export { useViewportKind } from './viewport/useViewportKind'

/** Headless structural primitives and their local contexts. */
export { CanvasRoot, CanvasSurface, useCanvasContext } from './Canvas'
export type {
  CanvasContext,
  CanvasRootProps,
  CanvasRootSlotProps,
  CanvasSurfaceProps
} from './Canvas'
export {
  ColorInputRoot,
  ColorPickerRoot,
  createColorPickerModel,
  createOkHCLSliderGradientModel,
  createOkHCLSliderPreviewModel,
  createSliderGradientModel,
  createSliderPreviewModel,
  fromPercent,
  rekaToAppColor,
  toPercent,
  updateAlpha,
  updateHSBChannel,
  updateHSLChannel,
  updateHue,
  updateRGBChannel,
  applySolidFillColor,
  applySolidStrokeColor
} from './ColorPicker'
export type {
  ColorInputRootProps,
  ColorInputRootSlotProps,
  ColorPickerRootProps,
  ColorPickerRootSlotProps,
  ColorFieldFormat,
  ColorFieldOption,
  OkHCLControls
} from './ColorPicker'
export { FillPickerRoot } from './FillPicker'
export type { FillPickerRootProps, FillPickerRootSlotProps } from './FillPicker'
export { FontPickerRoot } from './FontPicker'
export type { FontPickerRootProps, FontPickerRootSlotProps } from './FontPicker'
export { GradientEditorRoot, GradientEditorBar, GradientEditorStop } from './GradientEditor'
export type {
  GradientEditorRootProps,
  GradientEditorRootSlotProps,
  GradientEditorBarProps,
  GradientEditorBarSlotProps,
  GradientEditorStopProps,
  GradientEditorStopSlotProps
} from './GradientEditor'
export { LayerTreeRoot, LayerTreeItem, useLayerTree } from './LayerTree'
export type {
  LayerTreeContext,
  LayerNode,
  LayerTreeRootProps,
  LayerTreeItemProps
} from './LayerTree'
export { LayoutControlsRoot } from './LayoutControls'
export type { LayoutControlsRootProps, LayoutControlsRootSlotProps } from './LayoutControls'
export { AppearanceControlsRoot } from './AppearanceControls'
export type {
  AppearanceControlsRootProps,
  AppearanceControlsRootSlotProps
} from './AppearanceControls'
export { PageListRoot } from './PageList'
export type { PageListRootProps, PageListRootSlotProps } from './PageList'
export { PositionControlsRoot } from './PositionControls'
export type { PositionControlsRootProps, PositionControlsRootSlotProps } from './PositionControls'
export { PropertyListRoot, PropertyListItem, usePropertyList } from './PropertyList'
export type {
  PropertyListContext,
  PropertyListRootProps,
  PropertyListItemProps
} from './PropertyList'
export { ScrubInputRoot, ScrubInputField, ScrubInputDisplay, useScrubInput } from './ScrubInput'
export type {
  ScrubInputContext,
  ScrubInputRootProps,
  ScrubInputFieldProps,
  ScrubInputDisplayProps
} from './ScrubInput'
export { TypographyControlsRoot } from './TypographyControls'
export type {
  TypographyControlsRootProps,
  TypographyControlsRootSlotProps
} from './TypographyControls'
export { ToolbarRoot, ToolbarItem, useToolbar } from './Toolbar'
export type { ToolbarContext, ToolbarRootProps, ToolbarItemProps } from './Toolbar'

/** Internationalization. */
export { useI18n } from './i18n'
export { locale, localeSetting, setLocale, AVAILABLE_LOCALES, LOCALE_LABELS } from './i18n'
export type { Locale } from './i18n'
export {
  menuMessages,
  commandMessages,
  toolMessages,
  panelMessages,
  pageMessages,
  dialogMessages
} from './i18n'

/** Testing helpers. */
export { TEST_ID_ATTR, testIdProps, TEST_IDS } from './testing/test-id'
