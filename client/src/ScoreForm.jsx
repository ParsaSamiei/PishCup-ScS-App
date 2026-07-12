import React, { useMemo } from 'react';

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

function Item({ item, value, onChange }) {
  if (item.type === 'binary') {
    return (
      <label className="item-row checkbox-row">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        <span>{item.label}</span>
        <span className="pts">{item.points}</span>
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
      <div className="item-row">
        <div className="item-label">
          {item.label} <span className="pts">{item.points} / واحد</span>
        </div>
        <div className="option-grid">
          {item.options.map((opt) => (
            <label key={opt} className={'opt-box' + (arr.includes(opt) ? ' checked' : '')}>
              <input type="checkbox" checked={arr.includes(opt)} onChange={() => toggle(opt)} />
              {opt}
            </label>
          ))}
        </div>
        <div className="item-total">جمع: {item.points * arr.length}</div>
      </div>
    );
  }
  if (item.type === 'choice') {
    return (
      <div className="item-row">
        <div className="item-label">{item.label}</div>
        <div className="option-grid">
          {item.choices.map((c) => (
            <label key={c.label} className={'opt-box' + (value === c.value ? ' checked' : '')}>
              <input
                type="radio"
                name={item.key}
                checked={value === c.value}
                onChange={() => onChange(c.value)}
              />
              {c.label} ({c.value})
            </label>
          ))}
        </div>
      </div>
    );
  }
  if (item.type === 'scale') {
    return (
      <div className="item-row">
        <label className="item-label">
          {item.label} <span className="pts">حداکثر {item.points}</span>
        </label>
        <input
          type="number"
          min={0}
          max={item.points}
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="num-input"
        />
      </div>
    );
  }
  if (item.type === 'counter') {
    return (
      <div className="item-row">
        <label className="item-label">
          {item.label} <span className="pts">{item.points} / بار</span>
        </label>
        <input
          type="number"
          min={0}
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="num-input"
        />
      </div>
    );
  }
  return null;
}

function Section({ title, items, values, onChange }) {
  const { total, breakdown } = useMemo(() => calcSection(items, values), [items, values]);
  return (
    <div className="section">
      <div className="section-header">
        <h3>{title}</h3>
        <span className="section-total">{total}</span>
      </div>
      {items.map((item) => (
        <Item
          key={item.key}
          item={item}
          value={values[item.key]}
          onChange={(v) => onChange({ ...values, [item.key]: v })}
        />
      ))}
    </div>
  );
}

export default function ScoreForm({ league, values, onValuesChange }) {
  const v = values || { performance: {}, technical: {}, negative: {}, group: {} };

  const perf = calcSection(league.performance, v.performance || {});
  const tech = calcSection(league.technical, v.technical || {});
  const neg = calcSection(league.negative, v.negative || {});
  const group = calcSection(league.group, v.group || {});
  const final = perf.total + tech.total + neg.total + group.total;

  const update = (key, sectionValues) => onValuesChange({ ...v, [key]: sectionValues });

  return (
    <div className="score-form">
      <Section title="عملکرد ربات" items={league.performance} values={v.performance || {}} onChange={(s) => update('performance', s)} />
      <Section title="فنی ربات" items={league.technical} values={v.technical || {}} onChange={(s) => update('technical', s)} />
      <Section title="امتیازات منفی" items={league.negative} values={v.negative || {}} onChange={(s) => update('negative', s)} />
      <Section title="امتیازات گروهی" items={league.group} values={v.group || {}} onChange={(s) => update('group', s)} />
      <div className="final-total">امتیاز نهایی کل: <strong>{final}</strong></div>
    </div>
  );
}
