/// <reference types="vite/client" />

import type { PDFDocumentProxy } from 'pdfjs-dist'
import PdfJSWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { AssetRecordType, createShapeId, getAssetInfo } from 'tldraw'
import type { Editor, TLImageAsset, TLImageShape, TLShapePartial } from 'tldraw'
import { isValidPdfGridLayout } from './pdf-import-layout'
import type { PdfGridLayout } from './pdf-import-layout'

export async function openPdfDocument(file: File): Promise<PDFDocumentProxy> {
	const PdfJS = await import('pdfjs-dist')
	PdfJS.GlobalWorkerOptions.workerSrc = PdfJSWorkerSrc
	return PdfJS.getDocument(await file.arrayBuffer()).promise
}

export async function importPdfPages(
	editor: Editor,
	pdf: PDFDocumentProxy,
	layout: PdfGridLayout,
	name: string
) {
	if (!isValidPdfGridLayout(layout, pdf.numPages)) {
		throw new Error('Choose a valid grid layout.')
	}

	const { rows: rowCount, columns } = layout
	const deviceScale = Math.max(1, window.devicePixelRatio || 1)
	const renderScale = deviceScale * 1.5
	const canvas = document.createElement('canvas')
	const context = canvas.getContext('2d')
	if (!context) throw new Error('Failed to create canvas context.')

	const pages: Array<{ asset: TLImageAsset; width: number; height: number }> = []
	try {
		for (let i = 1; i <= pdf.numPages; i++) {
			const page = await pdf.getPage(i)
			const viewport = page.getViewport({ scale: renderScale })
			canvas.width = viewport.width
			canvas.height = viewport.height
			await page.render({ canvasContext: context, viewport }).promise
			const blob = await new Promise<Blob>((resolve, reject) => {
				canvas.toBlob((result) => {
					if (result) resolve(result)
					else reject(new Error(`Failed to encode PDF page ${i}.`))
				}, 'image/png')
			})
			const file = new File([blob], `${name} page ${i}.png`, { type: 'image/png' })
			const asset = await getAssetInfo(editor, file, AssetRecordType.createId())
			if (!asset || asset.type !== 'image') {
				throw new Error('Failed to prepare a PDF page as an image.')
			}
			const result = await editor.uploadAsset(asset, file)
			asset.props.src = result.src
			if (result.meta) asset.meta = { ...asset.meta, ...result.meta }
			pages.push({
				asset,
				width: viewport.width / deviceScale,
				height: viewport.height / deviceScale,
			})
		}
	} finally {
		canvas.width = 0
		canvas.height = 0
	}

	const columnWidths = Array.from({ length: columns }, () => 0)
	const rowHeights = Array.from({ length: rowCount }, () => 0)
	pages.forEach((page, index) => {
		columnWidths[index % columns] = Math.max(columnWidths[index % columns], page.width)
		rowHeights[Math.floor(index / columns)] = Math.max(
			rowHeights[Math.floor(index / columns)],
			page.height
		)
	})

	const pageSpacing = 32
	const gridWidth =
		columnWidths.reduce((sum, width) => sum + width, 0) + pageSpacing * (columns - 1)
	const gridHeight =
		rowHeights.reduce((sum, height) => sum + height, 0) + pageSpacing * (rowCount - 1)
	const viewport = editor.getViewportPageBounds()
	const startX = viewport.x + (viewport.w - gridWidth) / 2
	const startY = viewport.y + (viewport.h - gridHeight) / 2
	const columnOffsets: number[] = []
	for (let i = 0, offset = 0; i < columns; i++) {
		columnOffsets.push(offset)
		offset += columnWidths[i] + pageSpacing
	}
	const rowOffsets: number[] = []
	for (let i = 0, offset = 0; i < rowCount; i++) {
		rowOffsets.push(offset)
		offset += rowHeights[i] + pageSpacing
	}

	const shapeIds = pages.map(() => createShapeId())
	editor.createAssets(pages.map((page) => page.asset))
	editor.createShapes(
		pages.map((page, index): TLShapePartial<TLImageShape> => {
			const column = index % columns
			const row = Math.floor(index / columns)
			return {
				id: shapeIds[index],
				type: 'image',
				x: startX + columnOffsets[column] + (columnWidths[column] - page.width) / 2,
				y: startY + rowOffsets[row] + (rowHeights[row] - page.height) / 2,
				props: {
					assetId: page.asset.id,
					w: page.width,
					h: page.height,
				},
			}
		})
	)
	editor.setSelectedShapes(shapeIds)
	editor.zoomToSelection({ animation: { duration: editor.options.animationMediumMs } })
}
