-- Insert default invoice_issued SMS template if missing
INSERT INTO public.sms_templates (trigger, template_text, recipient_type, active)
SELECT 'invoice_issued'::sms_trigger,
       'مرحبا {customer_name}، تم إصدار فاتورة لطلبك #{order_number} بمبلغ {total}₪. للاطلاع: {invoice_url}',
       'customer',
       true
WHERE NOT EXISTS (
  SELECT 1 FROM public.sms_templates WHERE trigger = 'invoice_issued'::sms_trigger
);