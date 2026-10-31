import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
	defineMessages,
	F,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useTranslation,
} from 'tldraw'
import type { Editor } from 'tldraw'
import { importPdfPages, openPdfDocument } from '../../utils/pdf-import'
import { getDefaultPdfGridLayout, isValidPdfGridLayout } from '../../utils/pdf-import-layout'

const messages = defineMessages({
	pdfImportFailed: { defaultMessage: 'Could not import this PDF.' },
})

export function ImportPdfDialog({ editor, onClose }: { editor: Editor; onClose(): void }) {
	const msg = useTranslation()
	const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
	const [fileName, setFileName] = useState('')
	const [rows, setRows] = useState(1)
	const [columns, setColumns] = useState(1)
	const [isLoading, setIsLoading] = useState(false)
	const [isImporting, setIsImporting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		return () => {
			if (pdf) {
				void pdf.destroy().catch((err) => console.error('Failed to close PDF document:', err))
			}
		}
	}, [pdf])

	async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.currentTarget.files?.[0]
		if (!file) return

		setError(null)
		setIsLoading(true)
		setPdf(null)
		try {
			const document = await openPdfDocument(file)
			setPdf(document)
			setFileName(file.name)
			const layout = getDefaultPdfGridLayout(document.numPages)
			setRows(layout.rows)
			setColumns(layout.columns)
		} catch (err) {
			setError(err instanceof Error ? err.message : msg(messages.pdfImportFailed))
		} finally {
			setIsLoading(false)
		}
	}

	async function onImport() {
		if (!pdf) return
		setError(null)
		setIsImporting(true)
		try {
			await importPdfPages(editor, pdf, { rows, columns }, fileName)
			onClose()
		} catch (err) {
			setError(err instanceof Error ? err.message : msg(messages.pdfImportFailed))
			setIsImporting(false)
		}
	}

	const isValidLayout = pdf !== null && isValidPdfGridLayout({ rows, columns }, pdf.numPages)

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Import PDF pages" />
				</TldrawUiDialogTitle>
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody>
				<label htmlFor="tla-import-pdf-file">
					<F defaultMessage="Choose a PDF" />
				</label>
				<input
					id="tla-import-pdf-file"
					type="file"
					accept="application/pdf,.pdf"
					onChange={onFileChange}
					disabled={isLoading || isImporting}
					style={{ display: 'block', marginTop: 8 }}
				/>
				{isLoading && (
					<p>
						<F defaultMessage="Loading PDF…" />
					</p>
				)}
				{pdf && (
					<>
						<p>
							<F
								defaultMessage="{pageCount, plural, one {# page} other {# pages}}"
								values={{ pageCount: pdf.numPages }}
							/>
						</p>
						<label htmlFor="tla-import-pdf-rows">
							<F defaultMessage="Rows" />
						</label>
						<input
							id="tla-import-pdf-rows"
							type="number"
							min={1}
							max={pdf.numPages}
							step={1}
							value={rows}
							onChange={(event) => setRows(Number(event.currentTarget.value))}
							disabled={isImporting}
							style={{ display: 'block', marginTop: 8, width: 80 }}
						/>
						<label htmlFor="tla-import-pdf-columns">
							<F defaultMessage="Columns" />
						</label>
						<input
							id="tla-import-pdf-columns"
							type="number"
							min={1}
							max={pdf.numPages}
							step={1}
							value={columns}
							onChange={(event) => setColumns(Number(event.currentTarget.value))}
							disabled={isImporting}
							style={{ display: 'block', marginTop: 8, width: 80 }}
						/>
						{isValidLayout && (
							<p>
								<F defaultMessage="{rows} rows x {columns} columns" values={{ columns, rows }} />
							</p>
						)}
					</>
				)}
				{isImporting && (
					<p>
						<F defaultMessage="Importing pages…" />
					</p>
				)}
				{error && <p role="alert">{error}</p>}
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose} disabled={isLoading || isImporting}>
					<TldrawUiButtonLabel>
						<F defaultMessage="Cancel" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton
					type="primary"
					onClick={onImport}
					disabled={!isValidLayout || isLoading || isImporting}
				>
					<TldrawUiButtonLabel>
						<F defaultMessage="Import pages" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
