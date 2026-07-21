---
title: useLayout
description: Работа с автолейаутом, размерами, отступами, выравниванием и треками сетки.
---

# useLayout

`useLayout()` — основной компосабл управления для панелей, связанных с лейаутом.

Предоставляет состояние и действия для:

- режима flex vs grid
- размеров по ширине/высоте
- отступов
- выравнивания
- редактирования треков шаблона сетки

## Использование

```ts
import { useLayout } from '@open-pencil/react'

const layout = useLayout()
```

## Базовый пример

```ts
const {
  isGrid,
  isFlex,
  widthSizing,
  heightSizing,
  setAxisSizing,
  updateAxisSize,
  commitAxisSize,
} = useLayout()
```

## Практические примеры

### Переключение между единым и раздельным отступом

```ts
layout.toggleIndividualPadding()
```

### Обновление треков сетки

```ts
layout.updateGridTrack('gridTemplateColumns', 0, { sizing: 'FIXED', value: 240 })
layout.addTrack('gridTemplateRows')
```

### Изменение выравнивания

```ts
layout.setAlignment('CENTER', 'MAX')
```

## Связанные API

- [usePosition](./use-position)
- [useEditor](./use-editor)
