import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiCheck, FiX, FiStar, FiZap, FiShield,
  FiHeart, FiAward, FiChevronDown, FiChevronUp,
} from 'react-icons/fi';
import api from '../utils/api';

const PLAN_ICONS = {
  free: FiHeart,
  plus: FiStar,
  gold: FiZap,
  platinum: FiShield,
};

const PLAN_COLORS = {
  free: 'from-gray-400 to-gray-500',
  plus: 'from-pink-500 to-rose-500',
  gold: 'from-amber-400 to-orange-500',
  platinum: 'from-violet-500 to-purple-600',
};

const PLAN_BORDERS = {
  free: 'border-gray-200 dark:border-gray-700',
  plus: 'border-pink-200 dark:border-pink-800',
  gold: 'border-amber-200 dark:border-amber-800',
  platinum: 'border-violet-200 dark:border-violet-800',
};

const PLAN_BG = {
  free: 'bg-gray-50 dark:bg-gray-800/50',
  plus: 'bg-pink-50 dark:bg-pink-900/20',
  gold: 'bg-amber-50 dark:bg-amber-900/20',
  platinum: 'bg-violet-50 dark:bg-violet-900/20',
};

const PLAN_PRICES = {
  free: 0,
  plus: 2500,
  gold: 5000,
  platinum: 10000,
};

const PLAN_FEATURES = {
  free: [
    { name: 'Swipes', value: '50/day' },
    { name: 'Super Likes', value: '1/day' },
    { name: 'Boosts', value: false },
    { name: 'Rewind', value: false },
    { name: 'See who liked you', value: false },
    { name: 'Passport mode', value: false },
  ],
  plus: [
    { name: 'Swipes', value: 'Unlimited' },
    { name: 'Super Likes', value: '5/day' },
    { name: 'Boosts', value: '1/month' },
    { name: 'Rewind', value: true },
    { name: 'See who liked you', value: true },
    { name: 'Passport mode', value: false },
  ],
  gold: [
    { name: 'Swipes', value: 'Unlimited' },
    { name: 'Super Likes', value: '10/day' },
    { name: 'Boosts', value: '3/month' },
    { name: 'Rewind', value: true },
    { name: 'See who liked you', value: true },
    { name: 'Passport mode', value: true },
  ],
  platinum: [
    { name: 'Swipes', value: 'Unlimited' },
    { name: 'Super Likes', value: '20/day' },
    { name: 'Boosts', value: '5/month' },
    { name: 'Rewind', value: true },
    { name: 'See who liked you', value: true },
    { name: 'Passport mode', value: true },
  ],
};

const FEATURES_TABLE = [
  { name: 'Swipes', free: '50/day', plus: 'Unlimited', gold: 'Unlimited', platinum: 'Unlimited' },
  { name: 'Super Likes', free: '1/day', plus: '5/day', gold: '10/day', platinum: '20/day' },
  { name: 'Boosts', free: '-', plus: '1/mo', gold: '3/mo', platinum: '5/mo' },
  { name: 'Rewind', free: false, plus: true, gold: true, platinum: true },
  { name: 'See who liked you', free: false, plus: true, gold: true, platinum: true },
  { name: 'Passport mode', free: false, plus: false, gold: true, platinum: true },
  { name: 'Priority support', free: false, plus: false, gold: false, platinum: true },
];

const FAQS = [
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes! You can cancel your subscription at any time. Your premium features will remain active until the end of your current billing period. No hidden fees, no questions asked.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept Mobile Money (Airtel Money, TNM Mpamba), bank transfers, and all major debit/credit cards. All payments are processed securely.',
  },
  {
    q: 'What happens when my plan expires?',
    a: 'When your plan expires, your account reverts to the Free plan. You will keep your matches and conversations, but premium features like Unlimited Swipes, Super Likes, and Boosts will no longer be available until you resubscribe.',
  },
  {
    q: 'Can I switch plans mid-cycle?',
    a: 'Absolutely! If you upgrade, the new plan takes effect immediately and you are billed the difference. If you downgrade, the change applies at the start of your next billing cycle.',
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all duration-300">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <span className="font-medium text-gray-900 dark:text-white text-sm sm:text-base pr-2">{q}</span>
        {open ? (
          <FiChevronUp className="w-5 h-5 text-gray-500 shrink-0" />
        ) : (
          <FiChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
        )}
      </button>
      <div
        className={`transition-all duration-300 ease-in-out ${
          open ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <p className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

function FeatureCell({ value }) {
  if (value === true) return <FiCheck className="w-5 h-5 text-emerald-500 mx-auto" />;
  if (value === false) return <FiX className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />;
  return <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>;
}

export default function PremiumPage() {
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.subscriptions.current();
        setCurrentPlan(data.plan || 'free');
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    })();
  }, []);

  const handleSubscribe = async (planName) => {
    if (planName === currentPlan) return;
    setSubscribing(planName);
    setError(null);
    setSuccess(null);
    try {
      if (planName === 'free') {
        await api.subscriptions.subscribe(planName, 'manual');
        setCurrentPlan(planName);
        setSuccess(planName);
        setTimeout(() => setSuccess(null), 4000);
      } else {
        const result = await api.payments.createCheckout({ plan: planName });
        if (result.comingSoon) {
          setError('Payment coming soon');
          setTimeout(() => setError(null), 4000);
        } else if (result.url) {
          window.location.href = result.url;
          return;
        } else {
          await api.subscriptions.subscribe(planName, 'manual');
          setCurrentPlan(planName);
          setSuccess(planName);
          setTimeout(() => setSuccess(null), 4000);
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setTimeout(() => setError(null), 4000);
    }
    setSubscribing(null);
  };

  const getButtonLabel = (planName) => {
    if (planName === currentPlan) return 'Current';
    if (planName === 'free') return 'Downgrade';
    return 'Upgrade';
  };

  const planOrder = ['free', 'plus', 'gold', 'platinum'];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-500">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-yellow-200 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-300 rounded-full blur-3xl opacity-30" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Back button */}
        <div className="relative z-10 px-4 pt-4 sm:px-6 sm:pt-5">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-medium"
          >
            <FiArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>

        <div className="relative z-10 px-4 pb-10 sm:px-6 sm:pb-14 pt-4 sm:pt-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
            <FiAward className="w-4 h-4 text-white" />
            <span className="text-white/90 text-xs font-semibold uppercase tracking-wide">Premium Plans</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">
            Unlock Your Full<br className="sm:hidden" /> Potential
          </h1>
          <p className="text-white/80 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Stand out, connect faster, and find your perfect match with exclusive premium features.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 relative z-20">
        {/* Notifications */}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm text-center font-medium animate-pulse">
            Successfully subscribed to the {success.charAt(0).toUpperCase() + success.slice(1)} plan!
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm text-center font-medium">
            {error}
          </div>
        )}

        {/* Plan Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-10">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 py-6">
            {planOrder.map((planName) => {
              const isCurrent = planName === currentPlan;
              const isPopular = planName === 'gold';
              const isBestValue = planName === 'platinum';
              const Icon = PLAN_ICONS[planName];
              const isPaid = planName !== 'free';

              return (
                <div
                  key={planName}
                  className={`relative rounded-2xl p-5 sm:p-6 flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                    isPaid
                      ? `bg-gradient-to-br ${PLAN_BORDERS[planName]} border-2 ${PLAN_BG[planName]}`
                      : `border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60`
                  } ${isPopular ? 'ring-2 ring-amber-400 dark:ring-amber-500 shadow-lg shadow-amber-100 dark:shadow-amber-900/30' : ''} ${
                    isBestValue ? 'ring-2 ring-violet-400 dark:ring-violet-500 shadow-lg shadow-violet-100 dark:shadow-violet-900/30' : ''
                  }`}
                >
                  {/* Badges */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2">
                    {isPopular && (
                      <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                        Most Popular
                      </span>
                    )}
                    {isBestValue && (
                      <span className="bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                        Best Value
                      </span>
                    )}
                    {isCurrent && !isPopular && !isBestValue && (
                      <span className="bg-emerald-500 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                        Current
                      </span>
                    )}
                  </div>

                  {/* Icon + Plan Name */}
                  <div className="mt-2 mb-3 text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${PLAN_COLORS[planName]} mb-3 shadow-md`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{planName}</h3>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-5">
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                      MWK {PLAN_PRICES[planName].toLocaleString()}
                    </span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">per month</span>
                  </div>

                  {/* Features list */}
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {PLAN_FEATURES[planName].map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2.5 text-sm">
                        {feat.value === false ? (
                          <FiX className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                        ) : (
                          <FiCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        <span className={`${feat.value === false ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                          {feat.name}
                        </span>
                        {typeof feat.value === 'string' && feat.value !== 'Unlimited' && (
                          <span className="ml-auto text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {feat.value}
                          </span>
                        )}
                        {feat.value === 'Unlimited' && (
                          <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                            Unlimited
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(planName)}
                    disabled={isCurrent || subscribing === planName}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                      isCurrent
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default'
                        : isPopular
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-200 dark:hover:shadow-amber-900/40 hover:scale-[1.02]'
                          : isBestValue
                            ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-200 dark:hover:shadow-violet-900/40 hover:scale-[1.02]'
                            : isPaid
                              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:shadow-lg hover:shadow-pink-200 dark:hover:shadow-pink-900/40 hover:scale-[1.02]'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {subscribing === planName ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      getButtonLabel(planName)
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Feature Comparison Table */}
        <div className="mt-12 sm:mt-16">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-6 sm:mb-8">
            Feature Comparison
          </h2>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500 dark:text-gray-400 w-1/4">Feature</th>
                  {planOrder.map((p) => (
                    <th key={p} className={`text-center py-3 px-4 text-sm font-semibold capitalize ${p === 'gold' ? 'text-amber-600 dark:text-amber-400' : p === 'platinum' ? 'text-violet-600 dark:text-violet-400' : 'text-gray-900 dark:text-white'}`}>
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES_TABLE.map((feat, idx) => (
                  <tr key={idx} className={`border-b border-gray-100 dark:border-gray-800 ${idx % 2 === 0 ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''}`}>
                    <td className="py-3.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">{feat.name}</td>
                    {planOrder.map((p) => (
                      <td key={p} className="py-3.5 px-4 text-center">
                        <FeatureCell value={feat[p]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-14 sm:mt-20 mb-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-6 sm:mb-8">
            Frequently Asked Questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-3">
            {FAQS.map((faq, idx) => (
              <FaqItem key={idx} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
