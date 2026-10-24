export type StockInputs = {
  opening: number;
  receivedPurchases: number;
  customerReturns: number;
  sold: number;
  supplierReturns: number;
  damaged: number;
};

export function calculateCurrentStock(input: StockInputs) {
  return input.opening + input.receivedPurchases + input.customerReturns - input.sold - input.supplierReturns - input.damaged;
}

export function canReduceStock(currentStock: number, quantity: number, allowNegative = false) {
  return quantity > 0 && (allowNegative || currentStock >= quantity);
}
