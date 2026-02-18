
import React from 'react';
import { FinancialData, LineItem } from '../types';

interface Props {
  data: FinancialData;
}

/**
 * Primary component for displaying extracted financial statements.
 */
const FinancialTable: React.FC<Props> = ({ data }) => {
  const hasNoData = data.completeness === "Not Found" || !data.line_items.length;

  if (hasNoData) {
    return <EmptyStateView />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <StatementHeader 
          company={data.company_name} 
          currency={data.currency} 
          units={data.units} 
          completeness={data.completeness} 
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-50 z-10 w-1/3">
                  Particulars (Original)
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-widest bg-slate-50">
                  Mapping
                </th>
                {data.years.map((year) => (
                  <th key={year} className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.line_items.map((item, idx) => (
                <LineItemRow key={`${item.name}-${idx}`} item={item} years={data.years} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data.missing_line_items.length > 0 && (
        <MissingItemsAlert items={data.missing_line_items} />
      )}
    </div>
  );
};

/* --- Sub-Components (Scoped to this module for clarity) --- */

const StatementHeader: React.FC<{ company: string, currency: string | null, units: string | null, completeness: string }> = ({ company, currency, units, completeness }) => (
  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
    <div>
      <h2 className="text-xl font-bold text-slate-800">{company}</h2>
      <p className="text-sm text-slate-500 mt-1">
        Income Statement • {currency || 'Currency N/A'} ({units || 'Standard Units'})
      </p>
    </div>
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
      completeness === 'Complete' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
    }`}>
      {completeness}
    </span>
  </div>
);

const LineItemRow: React.FC<{ item: LineItem, years: string[] }> = ({ item, years }) => {
  const isStandardized = item.standardized_name !== item.name;

  return (
    <tr className="hover:bg-slate-50 transition-colors group">
      <td className="px-6 py-3.5 text-sm font-medium text-slate-700 sticky left-0 bg-white/95 backdrop-blur-sm z-10 border-r border-slate-50 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] group-hover:bg-slate-50">
        {item.name}
      </td>
      <td className="px-6 py-3.5 text-[10px] text-slate-400 font-mono italic">
        {isStandardized ? item.standardized_name : '-'}
      </td>
      {years.map((year) => (
        <td key={year} className="px-6 py-3.5 text-sm text-slate-600 text-right font-mono">
          {item.values[year] !== null 
            ? item.values[year]?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
            : '—'}
        </td>
      ))}
    </tr>
  );
};

const MissingItemsAlert: React.FC<{ items: string[] }> = ({ items }) => (
  <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4">
    <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-2 flex items-center gap-2">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      Missing Required components
    </h4>
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className="px-2 py-1 bg-white border border-rose-200 text-rose-600 text-[10px] font-bold rounded-md uppercase">
          {item}
        </span>
      ))}
    </div>
  </div>
);

const EmptyStateView = () => (
  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
    <div className="text-slate-400 mb-4">
      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-slate-800">No Statement Extracted</h3>
    <p className="text-slate-500 mt-2 max-w-sm mx-auto text-sm leading-relaxed">
      The AI could not identify a valid Statement of Profit & Loss in this specific document.
    </p>
  </div>
);

export default FinancialTable;
