import { PlusCircle, Trash2 } from 'lucide-react';
import { Select } from './forms/Select.jsx';
import { NumberInput } from './forms/NumberInput.jsx';
import { Input } from './forms/Input.jsx';
import { DatePicker } from './forms/DatePicker.jsx';

export function LineItemsEditor({
  products = [],
  value = [],
  onChange,
  showPrice = true,
  minRows = 1,
  getPriceForProduct,
  locationOptions = [],
}) {
  const productOptions = products.map((product) => ({
    value: product.id,
    label: `${product.sku} - ${product.name}`,
  }));

  const showLocation = Array.isArray(locationOptions);
  const primaryCols = showLocation
    ? (showPrice ? 'md:grid-cols-4' : 'md:grid-cols-3')
    : (showPrice ? 'md:grid-cols-3' : 'md:grid-cols-2');

  const updateLine = (index, changes) => {
    const next = value.map((line, idx) => (idx === index ? { ...line, ...changes } : line));
    onChange?.(next);
  };

  const addLine = () => {
    onChange?.([
      ...value,
      {
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: '',
        quantity: 1,
        price: 0,
        locationId: '',
        batch: '',
        expDate: '',
      },
    ]);
  };

  const removeLine = (index) => {
    if (value.length <= minRows) return;
    const next = value.filter((_, idx) => idx !== index);
    onChange?.(next);
  };

  return (
    <div className="space-y-3">
      {value.map((line, index) => (
        <div
          key={line.id ?? index}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-3">
              <div className={`grid grid-cols-1 gap-3 ${primaryCols}`}>
                <Select
                  label="Sản phẩm"
                  value={line.productId}
                  onChange={(event) =>
                    updateLine(index, (() => {
                      const productId = event.target.value;
                      const next = { productId };
                      if (getPriceForProduct) {
                        const price = getPriceForProduct(productId);
                        if (typeof price === 'number') {
                          next.price = price;
                        }
                      }
                      return next;
                    })())
                  }
                  options={productOptions}
                  placeholder="Chọn sản phẩm"
                  required
                />
                {showLocation ? (
                  <Select
                    label="Vị trí kho"
                    value={line.locationId || ''}
                    onChange={(event) =>
                      updateLine(index, {
                        locationId: event.target.value,
                      })
                    }
                    options={locationOptions}
                    placeholder="Chọn vị trí"
                    required
                  />
                ) : null}

                <NumberInput
                  label="Số lượng"
                  min={1}
                  value={line.quantity}
                  onChange={(event) =>
                    updateLine(index, {
                      quantity: Number(event.target.value),
                    })
                  }
                  required
                />
                {showPrice ? (
                  <NumberInput
                    label="Đơn giá"
                    min={0}
                    value={line.price}
                    onChange={(event) =>
                      updateLine(index, {
                        price: Number(event.target.value),
                      })
                    }
                    required
                  />
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input
                  label="Lô/Số hiệu (tùy chọn)"
                  value={line.batch || ''}
                  onChange={(event) =>
                    updateLine(index, {
                      batch: event.target.value,
                    })
                  }
                  placeholder="Lô/Số hiệu"
                />
                <DatePicker
                  label="Ngày hết hạn (tùy chọn)"
                  value={line.expDate || ''}
                  onChange={(event) =>
                    updateLine(index, {
                      expDate: event.target.value,
                    })
                  }
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeLine(index)}
              className="mt-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-rose-500 transition hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-500/20"
              disabled={value.length <= minRows}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addLine}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <PlusCircle className="h-4 w-4" />
        Thêm dòng sản phẩm
      </button>
    </div>
  );
}
