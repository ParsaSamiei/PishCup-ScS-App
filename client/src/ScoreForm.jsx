import React, { useMemo } from 'react';
import { ScoreNum } from './formatScore.jsx';

// Computes the same totals as the server, for live preview while judging.
export function calcSection(items, values) {
  let total = 0;
  const breakdown = {};
  for (const item of items) {
    let v = 0;
    const raw = values ? values[item.key] : undefined;
    if (item.type === 'binary') {
      v = raw ? item.points : 0;
    } else if (item.type === 'multi') {
      const count = Array.isArray(raw) ? raw.length : 0;
      v = item.points * count;
    } else if (item.type === 'choice') {
      const found = item.choices.find((c) => c.value === raw);
      v = found ? found.value : 0;
    } else if (item.type === 'scale') {
      const n = Number(raw) || 0;
      v = Math.max(0, Math.min(item.points, n));
    } else if (item.type === 'counter') {
      const n = Number(raw) || 0;
      v = item.points * n;
    }
    breakdown[item.key] = v;
    total += v;
  }
  return { total, breakdown };
}

function ItemDetails({ item, value, onChange, readOnly }) {
  if (item.type === 'binary') {
    return (
      <label className="detail-single">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} disabled={readOnly} />
      </label>
    );
  }

  if (item.type === 'multi') {
    const arr = Array.isArray(value) ? value : [];
    const toggle = (opt) => {
      const has = arr.includes(opt);
      onChange(has ? arr.filter((o) => o !== opt) : [...arr, opt]);
    };
    return (
      <div className="opt-grid">
        {item.options.map((opt) => (
          <label key={opt} className={'opt-chip' + (arr.includes(opt) ? ' checked' : '') + (readOnly ? ' opt-chip-disabled' : '')}>
            <span className="opt-chip-label">{opt}</span>
            <input type="checkbox" checked={arr.includes(opt)} onChange={() => toggle(opt)} disabled={readOnly} />
          </label>
        ))}
      </div>
    );
  }

  if (item.type === 'choice') {
    return (
      <div className="opt-grid opt-grid-wide">
        {item.choices.map((c) => (
          <label key={c.label} className={'opt-chip opt-chip-wide' + (value === c.value ? ' checked' : '') + (readOnly ? ' opt-chip-disabled' : '')}>
            <span className="opt-chip-label">{c.label}</span>
            <input
              type="radio"
              name={item.key}
              checked={value === c.value}
              onChange={() => onChange(c.value)}
              disabled={readOnly}
            />
          </label>
        ))}
      </div>
    );
  }

  if (item.type === 'scale') {
    return (
      <div className="detail-numeric">
        <input
          type="number"
          min={0}
          max={item.points}
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="num-input"
          disabled={readOnly}
        />
        <span className="numeric-hint">از {item.points}</span>
      </div>
    );
  }

  if (item.type === 'counter') {
    return (
      <div className="detail-numeric">
        <input
          type="number"
          min={0}
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="num-input"
          disabled={readOnly}
        />
        <span className="numeric-hint">بار</span>
      </div>
    );
  }

  return null;
}

function ItemRow({ item, value, rowScore, onChange, readOnly }) {
  return (
    <tr className="item-row">
      <td className="col-label">{item.label}</td>
      <td className="col-pts"><ScoreNum value={item.points} /></td>
      <td className="col-details">
        <ItemDetails item={item} value={value} onChange={onChange} readOnly={readOnly} />
      </td>
      <td className="col-total"><ScoreNum value={rowScore} /></td>
    </tr>
  );
}

const TONE = {
  performance: 'perf',
  technical: 'tech',
  negative: 'neg',
  group: 'group',
};

const SECTION_TITLES = {
  performance: 'عملکرد ربات',
  technical: 'فنی ربات',
  negative: 'امتیازات منفی',
  group: 'امتیازات گروهی',
};

function Section({ sectionKey, items, values, onChange, readOnly }) {
  const { total, breakdown } = useMemo(() => calcSection(items, values), [items, values]);
  const tone = TONE[sectionKey];
  const title = SECTION_TITLES[sectionKey];

  return (
    <div className={`sheet-section tone-${tone}`}>
      <div className="section-band">{title}</div>
      <table className="sheet-table">
        <thead>
          <tr>
            <th className="col-label">شرح آیتم</th>
            <th className="col-pts">امتیاز</th>
            <th className="col-details">جزئیات</th>
            <th className="col-total">جمع</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <ItemRow
              key={item.key}
              item={item}
              value={values[item.key]}
              rowScore={breakdown[item.key]}
              onChange={(v) => onChange({ ...values, [item.key]: v })}
              readOnly={readOnly}
            />
          ))}
        </tbody>
        <tfoot>
          <tr className="section-total-row">
            <td className="total-label" colSpan={3}>جمع بخش {title}</td>
            <td className="col-total"><ScoreNum value={total} /></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function ScoreForm({ league, values, onValuesChange, readOnly }) {
  const v = values || { performance: {}, technical: {}, negative: {}, group: {} };

  const perf = calcSection(league.performance, v.performance || {});
  const tech = calcSection(league.technical, v.technical || {});
  const neg = calcSection(league.negative, v.negative || {});
  const group = calcSection(league.group, v.group || {});
  const final = perf.total + tech.total + neg.total + group.total;

  const update = (key, sectionValues) => onValuesChange({ ...v, [key]: sectionValues });

  return (
    <div className="score-form">
      <Section sectionKey="performance" items={league.performance} values={v.performance || {}} onChange={(s) => update('performance', s)} readOnly={readOnly} />
      <Section sectionKey="technical" items={league.technical} values={v.technical || {}} onChange={(s) => update('technical', s)} readOnly={readOnly} />
      <Section sectionKey="negative" items={league.negative} values={v.negative || {}} onChange={(s) => update('negative', s)} readOnly={readOnly} />
      <Section sectionKey="group" items={league.group} values={v.group || {}} onChange={(s) => update('group', s)} readOnly={readOnly} />
      <div className="final-total">
        <span>امتیاز نهایی کل</span>
        <strong><ScoreNum value={final} /></strong>
      </div>
    </div>
  );
}
