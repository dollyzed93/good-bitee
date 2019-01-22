'use strict';

module.exports = function(Order) {
  Order.validatesInclusionOf('status', {in:
  ['pending', 'approved', 'cancelled',
    'deliveryBoyAssigned', 'completed',
    'food prepared', 'on the way']});
};
