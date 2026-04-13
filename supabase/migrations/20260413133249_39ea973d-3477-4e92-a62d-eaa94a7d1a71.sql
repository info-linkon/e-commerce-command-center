-- Reset order 119 to require proper payment recording
UPDATE orders 
SET status = 'processing', payment_method = NULL 
WHERE id = '940225e8-9432-4898-967c-d3674122fde1';
