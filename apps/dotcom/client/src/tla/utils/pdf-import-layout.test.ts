import { describe, expect, it } from 'vitest'
import { getDefaultPdfGridLayout, isValidPdfGridLayout } from './pdf-import-layout'

describe('PDF import grid layout', () => {
	it('chooses a balanced exact grid when possible', () => {
		expect(getDefaultPdfGridLayout(18)).toEqual({ rows: 3, columns: 6 })
	})

	it('chooses a balanced layout when the page count has no exact factor pair', () => {
		expect(getDefaultPdfGridLayout(17)).toEqual({ rows: 4, columns: 5 })
		expect(getDefaultPdfGridLayout(3)).toEqual({ rows: 2, columns: 2 })
	})

	it('handles a single-page PDF', () => {
		expect(getDefaultPdfGridLayout(1)).toEqual({ rows: 1, columns: 1 })
	})

	it('rejects invalid page counts', () => {
		expect(() => getDefaultPdfGridLayout(0)).toThrow('A PDF must contain at least one page.')
	})

	it('accepts grids with enough cells for every page', () => {
		expect(isValidPdfGridLayout({ rows: 1, columns: 18 }, 18)).toBe(true)
		expect(isValidPdfGridLayout({ rows: 6, columns: 3 }, 18)).toBe(true)
		expect(isValidPdfGridLayout({ rows: 3, columns: 6 }, 18)).toBe(true)
		expect(isValidPdfGridLayout({ rows: 4, columns: 5 }, 18)).toBe(true)
	})

	it('rejects grids that cannot fit all pages or have invalid dimensions', () => {
		expect(isValidPdfGridLayout({ rows: 2, columns: 8 }, 18)).toBe(false)
		expect(isValidPdfGridLayout({ rows: 0, columns: 18 }, 18)).toBe(false)
		expect(isValidPdfGridLayout({ rows: 3.5, columns: 6 }, 18)).toBe(false)
		expect(isValidPdfGridLayout({ rows: 19, columns: 1 }, 18)).toBe(false)
	})
})
