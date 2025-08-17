/**
 * TechCardManager - улучшенная версия с мобильной адаптацией
 * ИСПРАВЛЕНИЯ:
 * - Responsive table/card layout
 * - Touch-friendly inputs
 * - Improved mobile UX
 * - Better overflow handling
 */

import React, { memo, useState, useRef, useMemo, useCallback } from 'react'
import { Upload, X, Edit3, Trash2 } from 'lucide-react'
import Card from '../common/Card'
import Button from '../common/Button'
import NumberInput from '../common/NumberInput'
import { useIsMobile } from '../../hooks/use-mobile'

interface TechCardRow {
  _techCardId: string
  article: string
  name: string
  quantity: number
  unit: string
  price: number
  total: number
}

interface TechCardManagerProps {
  rows: TechCardRow[]
  totalCost: number
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemovePosition: (id: string) => void
  onAddPosition: () => void
  onImportExcel: (file: File) => void
  importing?: boolean
}

/**
 * Мобильная карточка строки техкарты
 */
const MobileCardRow = memo(function MobileCardRow({
  row,
  qtyDraft,
  onQtyChange,
  onQtyCommit,
  onRemove
}: {
  row: TechCardRow
  qtyDraft: Record<string, string>
  onQtyChange: (id: string, value: string) => void
  onQtyCommit: (id: string, value: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      {/* Заголовок с артикулом */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm text-blue-600 font-medium">{row.article}</div>
          <div className="text-sm text-gray-900 mt-1 line-clamp-2">{row.name}</div>
        </div>
        <button
          onClick={() => onRemove(row._techCardId)}
          className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Удалить позицию"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Количество и единица измерения */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Количество</label>
          <input
            type="text"
            inputMode="decimal"
            value={qtyDraft[row._techCardId] ?? String(row.quantity)}
            onChange={(e) => onQtyChange(row._techCardId, e.target.value)}
            onBlur={(e) => onQtyCommit(row._techCardId, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onQtyCommit(row._techCardId, (e.currentTarget as HTMLInputElement).value)
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[44px]"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Единица</label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 min-h-[44px] flex items-center">
            {row.unit}
          </div>
        </div>
      </div>

      {/* Цена и сумма */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Цена за ед.</label>
          <div className="text-sm font-medium text-gray-900">{formatCurrency(row.price, 'KGS')}</div>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Сумма</label>
          <div className="text-sm font-semibold text-blue-600">{formatCurrency(row.total, 'KGS')}</div>
        </div>
      </div>
    </div>
  )
})

/**
 * Desktop таблица (оригинальная логика, но с улучшениями)
 */
const DesktopTable = memo(function DesktopTable({
  rows,
  qtyDraft,
  onQtyChange,
  onQtyCommit,
  onRemove
}: {
  rows: TechCardRow[]
  qtyDraft: Record<string, string>
  onQtyChange: (id: string, value: string) => void
  onQtyCommit: (id: string, value: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            {['Артикул', 'Наименование', 'Кол-во', 'Ед.', 'Цена', 'Сумма', ''].map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                Техкарта пуста. Добавьте материал вручную или импортируйте из Excel.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row._techCardId} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-blue-600 font-medium">{row.article}</td>
                <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
                  <div className="truncate" title={row.name}>{row.name}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={qtyDraft[row._techCardId] ?? String(row.quantity)}
                    onChange={(e) => onQtyChange(row._techCardId, e.target.value)}
                    onBlur={(e) => onQtyCommit(row._techCardId, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        onQtyCommit(row._techCardId, (e.currentTarget as HTMLInputElement).value)
                      }
                    }}
                    className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                    aria-label="Количество"
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{row.unit}</td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatCurrency(row.price, 'KGS')}</td>
                <td className="px-4 py-3 text-sm font-semibold text-blue-600 whitespace-nowrap">{formatCurrency(row.total, 'KGS')}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onRemove(row._techCardId)}
                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Удалить позицию"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
})

/**
 * Основной компонент TechCardManager
 */
const TechCardManager = memo(function TechCardManager({
  rows,
  totalCost,
  onUpdateQuantity,
  onRemovePosition,
  onAddPosition,
  onImportExcel,
  importing = false
}: TechCardManagerProps) {
  const isMobile = useIsMobile()
  const inputRef = useRef<HTMLInputElement>(null)
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({})

  // Обработчики изменения количества
  const handleQtyChange = useCallback((id: string, value: string) => {
    setQtyDraft(prev => ({ ...prev, [id]: value }))
  }, [])

  const commitQty = useCallback((id: string, value: string) => {
    const num = parseFloat(value.replace(',', '.')) || 0
    onUpdateQuantity(id, num)
    setQtyDraft(prev => {
      const { [id]: _, ...rest } = prev
      return rest
    })
  }, [onUpdateQuantity])

  const removePosition = useCallback((id: string) => {
    onRemovePosition(id)
    setQtyDraft(prev => {
      const { [id]: _, ...rest } = prev
      return rest
    })
  }, [onRemovePosition])

  // Обработчик импорта Excel
  const doImport = useCallback((file: File | null | undefined) => {
    if (file) {
      onImportExcel(file)
    }
  }, [onImportExcel])

  return (
    <Card className="space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Техническая карта</h3>
          <p className="text-sm text-gray-600 mt-1">
            Состав материалов и расчет себестоимости
          </p>
        </div>
      </div>

      {/* Панель действий */}
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
        <div className={`${isMobile ? 'order-2' : ''}`}>
          <div className="text-right">
            <div className="text-sm text-gray-600">Итого материалы</div>
            <div className="text-xl font-bold text-blue-600">{formatCurrency(totalCost, 'KGS')}</div>
          </div>
        </div>
        
        <div className={`flex gap-2 ${isMobile ? 'order-1' : ''}`}>
          <Button
            onClick={onAddPosition}
            className="min-h-[44px]"
            size={isMobile ? "default" : "default"}
          >
            Добавить
          </Button>
          <Button
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={importing}
            className="min-h-[44px]"
            size={isMobile ? "default" : "default"}
          >
            <Upload size={18} className="mr-2" />
            {importing ? 'Импорт...' : 'Excel'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => doImport(e.target.files?.[0])}
            className="hidden"
          />
        </div>
      </div>

      {/* Responsive содержимое */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {isMobile ? (
          // Мобильная версия - карточки
          <div className="divide-y divide-gray-200">
            {rows.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Edit3 size={24} className="text-gray-400" />
                </div>
                <p className="text-sm">Техкарта пуста</p>
                <p className="text-xs text-gray-400 mt-1">
                  Добавьте материал вручную или импортируйте из Excel
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {rows.map((row) => (
                  <div key={row._techCardId} className="p-4">
                    <MobileCardRow
                      row={row}
                      qtyDraft={qtyDraft}
                      onQtyChange={handleQtyChange}
                      onQtyCommit={commitQty}
                      onRemove={removePosition}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Desktop версия - таблица
          <DesktopTable
            rows={rows}
            qtyDraft={qtyDraft}
            onQtyChange={handleQtyChange}
            onQtyCommit={commitQty}
            onRemove={removePosition}
          />
        )}
      </div>

      {/* Справочная информация */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-800">
          <strong>Формат Excel для импорта:</strong> колонка A — артикул материала, колонка B — количество. 
          Первая строка может быть заголовком.
        </div>
      </div>
    </Card>
  )
})

/**
 * Utility function для форматирования валюты
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency === 'KGS' ? 'KGS' : 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default TechCardManager