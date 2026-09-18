import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export const UpgradeModal = ({ storeId, onClose }: { storeId: string; onClose: () => void }) => {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [method, setMethod] = useState<'baridimob' | 'cardless'>('baridimob');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [withdrawalCode, setWithdrawalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const amount = plan === 'monthly' ? 1500 : 15000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let receiptUrl = '';

    if (method === 'baridimob' && receipt) {
      const fileExt = receipt.name.split('.').pop();
      const filePath = `receipts/${storeId}_${Date.now()}.${fileExt}`;
      const { data } = await supabase.storage.from('subscriptions').upload(filePath, receipt);
      if (data) receiptUrl = data.path;
    }

    await supabase.from('subscription_requests').insert({
      store_id: storeId,
      plan_type: plan,
      amount: amount,
      payment_method: method,
      receipt_url: receiptUrl,
      cardless_code: method === 'cardless' ? withdrawalCode : null,
      phone_number: method === 'cardless' ? phone : null,
      status: 'pending'
    });

    setLoading(false);
    onClose();
    alert('تم إرسال طلب الترقية بنجاح! سيتم مراجعته وتفعيل حسابك في أقرب وقت.');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 dir-rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 text-right">
        <h2 className="text-xl font-bold text-white">ترقية الحساب إلى AB Pro 🚀</h2>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPlan('monthly')}
            className={`p-3 rounded-xl border text-center transition ${
              plan === 'monthly' ? 'border-yellow-500 bg-yellow-500/10 text-white' : 'border-slate-800 text-slate-400'
            }`}
          >
            <div className="font-bold text-sm">شهري</div>
            <div className="text-xs text-yellow-500 mt-1">1,500 دج / شهر</div>
          </button>
          <button
            type="button"
            onClick={() => setPlan('yearly')}
            className={`p-3 rounded-xl border text-center transition ${
              plan === 'yearly' ? 'border-yellow-500 bg-yellow-500/10 text-white' : 'border-slate-800 text-slate-400'
            }`}
          >
            <div className="font-bold text-sm">سنوي (توفير)</div>
            <div className="text-xs text-yellow-500 mt-1">15,000 دج / سنة</div>
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-xs text-slate-400">اختر طريقة التحويل</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMethod('baridimob')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 ${
                method === 'baridimob' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800'
              }`}
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Alg%C3%A9rie_Poste_logo.svg/1200px-Alg%C3%A9rie_Poste_logo.svg.png" className="h-6 object-contain" alt="BaridiMob" />
              <span className="text-xs text-slate-200">تحويل BaridiMob</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod('cardless')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 ${
                method === 'cardless' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800'
              }`}
            >
              <span className="text-lg">🏧</span>
              <span className="text-xs text-slate-200">سحب بدون بطاقة</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {method === 'baridimob' ? (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
              <p className="text-slate-300">قم بتحويل مبلغ <span className="text-yellow-400 font-bold">{amount} دج</span> إلى الحساب التالي:</p>
              <div className="bg-slate-900 p-2 rounded border border-slate-700 font-mono text-blue-400 text-center select-all">
                RIP: 00799999000000000000
              </div>
              <label className="block text-slate-400 mt-2">ارفاق صورة وصل التحويل (Reçu)</label>
              <input type="file" accept="image/*" onChange={(e) => setReceipt(e.target.files?.[0] || null)} required className="w-full text-xs text-slate-400 file:ml-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-200" />
            </div>
          ) : (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <p className="text-xs text-slate-300">أنشئ رمز سحب بمبلغ <span className="text-yellow-400 font-bold">{amount} دج</span> من تطبيق BaridiMob وأدخله هنا:</p>
              <input type="text" placeholder="رمز السحب (Code de retrait)" value={withdrawalCode} onChange={(e) => setWithdrawalCode(e.target.value)} required className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs" />
              <input type="tel" placeholder="رقم الهاتف المرتبط بالرمز" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs" />
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition">
              {loading ? 'جاري الإرسال...' : 'تأكيد وإرسال الطلب'}
            </button>
            <button type="button" onClick={onClose} className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
};
