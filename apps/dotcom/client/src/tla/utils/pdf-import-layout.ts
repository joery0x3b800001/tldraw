export interface PdfGridLayout {
	rows: number
	columns: number
}

export function getDefaultPdfGridLayout(pageCount: number): PdfGridLayout {
	if (!Number.isSafeInteger(pageCount) || pageCount < 1) {
		throw new Error('A PDF must contain at least one page.')
	}

	const maxRows = Math.floor(Math.sqrt(pageCount))
	let bestExactLayout: PdfGridLayout | undefined

	for (let rows = 2; rows <= maxRows; rows++) {
		if (pageCount % rows !== 0) continue
		const columns = pageCount / rows
		const imbalance = Math.abs(rows - columns)
		if (!bestExactLayout || imbalance < bestExactLayout.columns - bestExactLayout.rows) {
			bestExactLayout = { rows, columns }
		}
	}

	if (bestExactLayout) return bestExactLayout

	let bestLayout = { rows: 1, columns: pageCount }
	let bestImbalance = Math.abs(bestLayout.rows - bestLayout.columns)
	for (let rows = 1; rows <= Math.ceil(Math.sqrt(pageCount)); rows++) {
		const columns = Math.ceil(pageCount / rows)
		const imbalance = Math.abs(rows - columns)
		if (
			imbalance < bestImbalance ||
			(imbalance === bestImbalance && rows <= columns && bestLayout.rows > bestLayout.columns)
		) {
			bestLayout = { rows, columns }
			bestImbalance = imbalance
		}
	}

	return bestLayout
}

export function isValidPdfGridLayout(layout: PdfGridLayout, pageCount: number) {
	return (
		Number.isSafeInteger(pageCount) &&
		pageCount > 0 &&
		Number.isSafeInteger(layout.rows) &&
		layout.rows >= 1 &&
		layout.rows <= pageCount &&
		Number.isSafeInteger(layout.columns) &&
		layout.columns >= 1 &&
		layout.columns <= pageCount &&
		layout.rows * layout.columns >= pageCount
	)
}
