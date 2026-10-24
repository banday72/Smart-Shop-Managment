import test from "node:test";
import assert from "node:assert/strict";

function calculateCurrentStock({ opening, receivedPurchases, customerReturns, sold, supplierReturns, damaged }) {
  return opening + receivedPurchases + customerReturns - sold - supplierReturns - damaged;
}

function canReduceStock(currentStock, quantity, allowNegative = false) {
  return quantity > 0 && (allowNegative || currentStock >= quantity);
}

test("calculates stock from all movement categories", () => {
  assert.equal(calculateCurrentStock({ opening: 20, receivedPurchases: 15, customerReturns: 2, sold: 10, supplierReturns: 1, damaged: 3 }), 23);
});

test("prevents stock from going below zero by default", () => {
  assert.equal(canReduceStock(3, 4), false);
  assert.equal(canReduceStock(3, 4, true), true);
  assert.equal(canReduceStock(3, 0), false);
});
