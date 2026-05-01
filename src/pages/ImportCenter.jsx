import { useState } from 'react';
import { analyzeImport, confirmImport } from '../services/api';
import toast from 'react-hot-toast';

const STEPS = { UPLOAD: 'upload', PREVIEW: 'preview', DONE: 'done' };

const parseDate = (raw) => {
  if (!raw) return null;
  // Try DD/MM/YYYY
  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const y = dmy[3].length === 2 ? '20' + dmy[3] : dmy[3];
    return `${y}-${String(dmy[2]).padStart(2,'0')}-${String(dmy[1]).padStart(2,'0')}`;
  }
  // Try YYYY-MM-DD or ISO
  const iso = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2,'0')}-${String(iso[3]).padStart(2,'0')}`;
  // Try "29 Apr 2026"
  const months = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  const wordy = raw.match(/(\d{1,2})\s+([a-z]{3})\s+(\d{4})/i);
  if (wordy) {
    const m = months[wordy[2].toLowerCase()];
    return `${wordy[3]}-${String(m).padStart(2,'0')}-${String(wordy[1]).padStart(2,'0')}`;
  }
  return null;
};

export default function ImportCenter() {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f && f.name.endsWith('.csv')) setFile(f);
    else toast.error('Please upload a .csv file');
  };

  const handleAnalyze = async () => {
    if (!file) return toast.error('Please select a CSV file first');
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('csv', file);
      const res = await analyzeImport(formData);
      const { mapping, raw_data, categories } = res.data;

      // Process all rows using the mapping
      const processed = raw_data.map((row, i) => {
        let amount = 0;
        let type = 'expense';

        if (mapping.type_logic === 'split') {
          const debit = parseFloat(row[mapping.debit_column]?.replace(/[,₹\s]/g, '') || '0');
          const credit = parseFloat(row[mapping.credit_column]?.replace(/[,₹\s]/g, '') || '0');
          if (credit > 0) { amount = credit; type = 'income'; }
          else { amount = debit; type = 'expense'; }
        } else {
          const raw = parseFloat(row[mapping.amount_column]?.replace(/[,₹\s]/g, '') || '0');
          amount = Math.abs(raw);
          type = raw >= 0 ? 'income' : 'expense';
        }

        // Handle split date columns (e.g. Year, Month, Day)
        let rawDate = '';
        if (mapping.date_column) {
          rawDate = row[mapping.date_column] || '';
        } else if (mapping.date_parts) {
          const y = row[mapping.date_parts.year] || '';
          const m = row[mapping.date_parts.month] || '';
          const d = row[mapping.date_parts.day] || '';
          rawDate = `${d} ${m} ${y}`;
        }
        const date = parseDate(rawDate);
        const description = row[mapping.description_column] || '';

        // Auto-match category by description keyword
        const matchedCat = categories.find(c =>
          c.type === type && description.toLowerCase().includes(c.name.toLowerCase())
        );

        return {
          _id: i,
          include: amount > 0 && !!date,
          date: date || '',
          amount,
          type,
          description,
          category_id: matchedCat?.id || '',
          note: description.slice(0, 100),
          categories: categories.filter(c => c.type === type || type === 'expense'),
        };
      }).filter(r => r.amount > 0);

      setAnalysisData(res.data);
      setRows(processed);
      setStep(STEPS.PREVIEW);
    } catch (err) {
      toast.error('Analysis failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    const toImport = rows.filter(r => r.include && r.date);
    if (toImport.length === 0) return toast.error('No valid rows selected');
    setImporting(true);
    try {
      const res = await confirmImport({
        transactions: toImport.map(r => ({
          date: r.date,
          amount: r.amount,
          type: r.type,
          category_id: r.category_id || null,
          note: r.note,
        }))
      });
      setResult(res.data);
      setStep(STEPS.DONE);
    } catch (err) {
      toast.error('Import failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setImporting(false);
    }
  };

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r));
  };

  const selectedCount = rows.filter(r => r.include).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>AI Import</div>
        <div style={styles.subtitle}>Smart CSV importer powered by Gemini AI</div>
      </div>

      {/* Step indicators */}
      <div style={styles.steps}>
        {['Upload', 'Preview & Edit', 'Done'].map((s, i) => {
          const stepKeys = [STEPS.UPLOAD, STEPS.PREVIEW, STEPS.DONE];
          const active = step === stepKeys[i];
          const done = [STEPS.PREVIEW, STEPS.DONE].includes(step) && i === 0
            || step === STEPS.DONE && i === 1;
          return (
            <div key={i} style={styles.stepItem}>
              <div style={{
                ...styles.stepDot,
                background: active ? '#00f5a0' : done ? '#00f5a044' : '#2a2f45',
                border: active ? '2px solid #00f5a0' : '2px solid transparent',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <div style={{ ...styles.stepLabel, color: active ? '#00f5a0' : '#8892b0' }}>{s}</div>
            </div>
          );
        })}
      </div>

      {/* STEP 1: Upload */}
      {step === STEPS.UPLOAD && (
        <div style={styles.card}>
          <div style={styles.uploadArea} onClick={() => document.getElementById('csv-input').click()}>
            <div style={styles.uploadIcon}>📂</div>
            <div style={styles.uploadText}>
              {file ? `✅ ${file.name}` : 'Click to select your bank CSV file'}
            </div>
            <div style={styles.uploadHint}>Supports any bank format • Max 5MB</div>
            <input id="csv-input" type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
          </div>

          <div style={styles.infoBox}>
            <div style={styles.infoTitle}>🤖 How AI Import works</div>
            <div style={styles.infoText}>1. Upload any bank CSV — AI detects column structure automatically</div>
            <div style={styles.infoText}>2. Review and adjust the mapped transactions</div>
            <div style={styles.infoText}>3. Confirm import — duplicates are skipped automatically</div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!file || analyzing}
            style={{ ...styles.btn, opacity: (!file || analyzing) ? 0.5 : 1 }}
          >
            {analyzing ? '🤖 AI is analyzing your CSV...' : '🚀 Analyze with AI'}
          </button>
        </div>
      )}

      {/* STEP 2: Preview */}
      {step === STEPS.PREVIEW && (
        <div>
          <div style={styles.summaryBar}>
            <span style={styles.summaryText}>
              📊 {rows.length} transactions detected • <span style={{ color: '#00f5a0' }}>{selectedCount} selected</span>
            </span>
            <div style={styles.summaryActions}>
              <button onClick={() => setRows(r => r.map(x => ({ ...x, include: true })))} style={styles.smallBtn}>Select All</button>
              <button onClick={() => setRows(r => r.map(x => ({ ...x, include: false })))} style={styles.smallBtn}>Deselect All</button>
            </div>
          </div>

          <div style={styles.tableWrapper}>
            {rows.map(row => (
              <div key={row._id} style={{
                ...styles.rowCard,
                opacity: row.include ? 1 : 0.4,
                borderColor: row.include ? '#2a2f45' : '#1a1f35',
              }}>
                <div style={styles.rowTop}>
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={e => updateRow(row._id, 'include', e.target.checked)}
                    style={styles.checkbox}
                  />
                  <input
                    type="date"
                    value={row.date}
                    onChange={e => updateRow(row._id, 'date', e.target.value)}
                    style={styles.dateInput}
                  />
                  <select
                    value={row.type}
                    onChange={e => updateRow(row._id, 'type', e.target.value)}
                    style={{ ...styles.select, color: row.type === 'income' ? '#00f5a0' : row.type === 'investment' ? '#6c5ce7' : '#ff4757' }}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="investment">Investment</option>
                  </select>
                  <div style={{ ...styles.amount, color: row.type === 'income' ? '#00f5a0' : '#ff4757' }}>
                    ₹{Number(row.amount).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={styles.rowBottom}>
                  <input
                    value={row.note}
                    onChange={e => updateRow(row._id, 'note', e.target.value)}
                    placeholder="Note (optional)"
                    style={styles.noteInput}
                    maxLength={100}
                  />
                  <select
                    value={row.category_id}
                    onChange={e => updateRow(row._id, 'category_id', e.target.value)}
                    style={styles.select}
                  >
                    <option value="">No category</option>
                    {(analysisData?.categories || [])
                      .filter(c => c.type === row.type || row.type === 'expense')
                      .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                    }
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.actionRow}>
            <button onClick={() => setStep(STEPS.UPLOAD)} style={styles.backBtn}>← Back</button>
            <button
              onClick={handleConfirm}
              disabled={importing || selectedCount === 0}
              style={{ ...styles.btn, flex: 1, opacity: (importing || selectedCount === 0) ? 0.5 : 1 }}
            >
              {importing ? 'Importing...' : `✅ Import ${selectedCount} Transactions`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Done */}
      {step === STEPS.DONE && result && (
        <div style={styles.card}>
          <div style={styles.doneIcon}>🎉</div>
          <div style={styles.doneTitle}>Import Complete!</div>
          <div style={styles.statsRow}>
            <div style={styles.statBox}>
              <div style={{ ...styles.statNum, color: '#00f5a0' }}>{result.imported}</div>
              <div style={styles.statLabel}>Imported</div>
            </div>
            <div style={styles.statBox}>
              <div style={{ ...styles.statNum, color: '#ffa502' }}>{result.skipped}</div>
              <div style={styles.statLabel}>Skipped (duplicates)</div>
            </div>
            <div style={styles.statBox}>
              <div style={{ ...styles.statNum, color: '#8892b0' }}>{result.total}</div>
              <div style={styles.statLabel}>Total</div>
            </div>
          </div>
          <button onClick={() => { setStep(STEPS.UPLOAD); setFile(null); setRows([]); setResult(null); }} style={styles.btn}>
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', background: '#0a0e1a', minHeight: '100vh', paddingBottom: '80px' },
  header: { marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: '13px', color: '#8892b0', marginTop: '4px' },

  steps: { display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center' },
  stepItem: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1 },
  stepDot: { width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0 },
  stepLabel: { fontSize: '12px', fontWeight: '600' },

  card: { background: '#1a1f35', borderRadius: '16px', padding: '24px', border: '1px solid #2a2f45' },
  uploadArea: { border: '2px dashed #2a2f45', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: '20px', transition: 'border-color 0.2s' },
  uploadIcon: { fontSize: '40px', marginBottom: '12px' },
  uploadText: { fontSize: '15px', fontWeight: '600', color: '#fff', marginBottom: '8px' },
  uploadHint: { fontSize: '12px', color: '#8892b0' },

  infoBox: { background: '#0a0e1a', borderRadius: '10px', padding: '16px', marginBottom: '20px' },
  infoTitle: { fontSize: '13px', fontWeight: '700', color: '#00f5a0', marginBottom: '10px' },
  infoText: { fontSize: '12px', color: '#8892b0', marginBottom: '6px' },

  btn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #00f5a0, #0066ff)', border: 'none', borderRadius: '12px', color: '#0a0e1a', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' },
  backBtn: { padding: '14px 20px', background: '#2a2f45', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },

  summaryBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' },
  summaryText: { fontSize: '14px', color: '#8892b0', fontWeight: '600' },
  summaryActions: { display: 'flex', gap: '8px' },
  smallBtn: { padding: '6px 12px', background: '#1a1f35', border: '1px solid #2a2f45', borderRadius: '8px', color: '#fff', fontSize: '12px', cursor: 'pointer' },

  tableWrapper: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', maxHeight: '60vh', overflowY: 'auto' },
  rowCard: { background: '#1a1f35', borderRadius: '12px', padding: '12px', border: '1px solid', transition: 'opacity 0.2s' },
  rowTop: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' },
  rowBottom: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  checkbox: { width: '18px', height: '18px', accentColor: '#00f5a0', cursor: 'pointer', flexShrink: 0 },
  dateInput: { background: '#0a0e1a', border: '1px solid #2a2f45', borderRadius: '8px', color: '#fff', padding: '6px 8px', fontSize: '12px', outline: 'none' },
  select: { background: '#0a0e1a', border: '1px solid #2a2f45', borderRadius: '8px', color: '#fff', padding: '6px 8px', fontSize: '12px', outline: 'none', flex: 1, minWidth: '120px' },
  noteInput: { flex: 2, minWidth: '150px', background: '#0a0e1a', border: '1px solid #2a2f45', borderRadius: '8px', color: '#fff', padding: '6px 10px', fontSize: '12px', outline: 'none' },
  amount: { fontSize: '15px', fontWeight: '700', flexShrink: 0, marginLeft: 'auto' },

  actionRow: { display: 'flex', gap: '10px', marginTop: '8px' },

  doneIcon: { fontSize: '48px', textAlign: 'center', marginBottom: '12px' },
  doneTitle: { fontSize: '22px', fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: '24px' },
  statsRow: { display: 'flex', gap: '12px', marginBottom: '24px' },
  statBox: { flex: 1, background: '#0a0e1a', borderRadius: '12px', padding: '16px', textAlign: 'center' },
  statNum: { fontSize: '28px', fontWeight: '800', marginBottom: '4px' },
  statLabel: { fontSize: '11px', color: '#8892b0', fontWeight: '600' },
};
