/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 */

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} sku
 * @property {string} name
 * @property {string} categoryId
 * @property {number} priceIn
 * @property {number} priceOut
 * @property {string} unit
 * @property {string} [status]
 * @property {string} [barcode]
 */

/**
 * @typedef {Object} Supplier
 * @property {string} id
 * @property {string} name
 * @property {string} contact
 * @property {string} [contract]
 */

/**
 * @typedef {Object} Customer
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} [policy]
 */

/**
 * @typedef {Object} Warehouse
 * @property {string} id
 * @property {string} name
 * @property {string} location
 */

/**
 * @typedef {Object} InventoryItem
 * @property {string} id
 * @property {string} productId
 * @property {number} quantity
 * @property {string} status
 * @property {string} [locationId]
 */

/**
 * @typedef {Object} ReceiptLine
 * @property {string} id
 * @property {string} productId
 * @property {string} sku
 * @property {string} name
 * @property {number} quantity
 * @property {number} price
 */

/**
 * @typedef {Object} Receipt
 * @property {string} id
 * @property {string} supplierId
 * @property {string} date
 * @property {string} status
 * @property {ReceiptLine[]} lines
 * @property {number} total
 * @property {boolean} [hasShortage]
 * @property {string} [shortageNote]
 * @property {string} [damageNote]
 */

/**
 * @typedef {Object} DeliveryLine
 * @property {string} id
 * @property {string} productId
 * @property {string} sku
 * @property {string} name
 * @property {number} quantity
 * @property {number} price
 */

/**
 * @typedef {Object} Delivery
 * @property {string} id
 * @property {string} customerId
 * @property {string} date
 * @property {string} status
 * @property {DeliveryLine[]} lines
 * @property {number} total
 * @property {string} [note]
 */

/**
 * @typedef {Object} Incident
 * @property {string} id
 * @property {string} type
 * @property {string} note
 * @property {string} action
 * @property {string} [relatedId]
 */

/**
 * @typedef {Object} StocktakingAdjustment
 * @property {string} id
 * @property {string} productId
 * @property {number} recordedQuantity
 * @property {number} actualQuantity
 * @property {number} difference
 * @property {string} reason
 * @property {string} status
 */

/**
 * @typedef {Object} Stocktaking
 * @property {string} id
 * @property {string} name
 * @property {string} date
 * @property {string} status
 * @property {StocktakingAdjustment[]} adjustments
 */

/**
 * @typedef {Object} ReturnOrder
 * @property {string} id
 * @property {string} customerId
 * @property {string} date
 * @property {string} reason
 * @property {Array<{id: string, productId: string, quantity: number}>} items
 * @property {string} status
 */

/**
 * @typedef {Object} Disposal
 * @property {string} id
 * @property {string} reason
 * @property {string} date
 * @property {Array<{id: string, productId: string, quantity: number}>} items
 * @property {string} status
 * @property {string} [council]
 * @property {string} [attachment]
 */
