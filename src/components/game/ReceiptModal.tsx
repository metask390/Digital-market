'use client'

import { CheckCircle2, Download, Share2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Deposit, Withdrawal } from '@/lib/types'

type ReceiptPayload =
  | { type: 'deposit'; data: Deposit; email: string }
  | { type: 'withdrawal'; data: Withdrawal; email: string }

export default function ReceiptModal({ receipt, autoExport = false, onClose }: { receipt: ReceiptPayload; autoExport?: boolean; onClose: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const isDeposit = receipt.type === 'deposit'
  const transactionId = receipt.data.id
  const amount = isDeposit ? receipt.data.total_amount : receipt.data.amount
  const date = receipt.data.created_at ? new Date(receipt.data.created_at).toLocaleString('en-PK') : '—'
  const receiver = isDeposit ? receipt.email : `${receipt.data.account_name} · ${receipt.data.account_number}`
  const canShare = typeof navigator !== 'undefined' && Boolean(navigator.share)
  const autoExported = useRef(false)

  async function handleExport() {
    if (!receiptRef.current || exporting) return
    setExporting(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(receiptRef.current, { backgroundColor: '#ffffff', scale: 2, useCORS: true })
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
      const fileName = `Receipt-${transactionId}.png`
      if (blob && canShare && navigator.canShare?.({ files: [new File([blob], fileName, { type: 'image/png' })] })) {
        const file = new File([blob], fileName, { type: 'image/png' })
        await navigator.share({ title: 'Egg Market Receipt', text: 'My Egg Market transaction receipt', files: [file] })
      } else {
        const link = document.createElement('a')
        link.href = canvas.toDataURL('image/png')
        link.download = fileName
        link.click()
      }
    } finally { setExporting(false) }
  }

  useEffect(() => {
    if (!autoExport || autoExported.current) return
    autoExported.current = true
    const timer = window.setTimeout(() => void handleExport(), 150)
    return () => window.clearTimeout(timer)
  }, [autoExport])

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Transaction receipt"><div ref={receiptRef} className="w-full max-w-sm rounded-[2rem] bg-white p-5 text-ink shadow-2xl"><div className="flex justify-end"><button type="button" onClick={onClose} aria-label="Close receipt" className="rounded-full p-2 text-ink/45 hover:bg-black/5"><X className="h-5 w-5" /></button></div><div className="text-center"><CheckCircle2 className="mx-auto h-16 w-16 text-leaf" strokeWidth={1.8} /><h2 className="mt-2 font-display text-2xl text-leaf-dark">Transaction Successful</h2><p className="text-xs font-bold text-ink/50">Egg Market · {isDeposit ? 'Deposit Approved' : 'Withdrawal Successful'}</p></div><div className="my-4 border-t-2 border-dashed border-ink/15" /><div className="space-y-3 text-sm"><div className="flex justify-between gap-4"><span className="font-bold text-ink/50">Transaction ID</span><span className="max-w-[12rem] break-all text-right font-black text-ink">{transactionId}</span></div><div className="flex justify-between gap-4"><span className="font-bold text-ink/50">Date & time</span><span className="text-right font-bold">{date}</span></div><div className="flex justify-between gap-4"><span className="font-bold text-ink/50">Amount</span><span className="font-display text-xl text-barn">{amount.toLocaleString('en-US')} Rs</span></div><div className="flex justify-between gap-4"><span className="font-bold text-ink/50">Sender</span><span className="text-right font-bold">Admin (Egg Market)</span></div><div className="flex justify-between gap-4"><span className="font-bold text-ink/50">Receiver</span><span className="max-w-[12rem] text-right font-bold">{receiver}</span></div></div><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => void handleExport()} disabled={exporting} className="flex items-center justify-center gap-1.5 rounded-2xl bg-leaf py-3 text-sm font-black text-white disabled:opacity-60">{canShare ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}{exporting ? 'Preparing…' : canShare ? 'Share Receipt' : 'Save Image'}</button><button type="button" onClick={onClose} className="rounded-2xl bg-black/5 py-3 text-sm font-black text-ink/70">Close</button></div></div></div>
}

export type { ReceiptPayload }
