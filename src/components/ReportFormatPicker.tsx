export type ReportFormat = 'pdf-native' | 'html' | 'pdf' | 'csv';

export const REPORT_FORMATS: ReadonlyArray<{ format: ReportFormat; label: string; description: string; icon: ReportFormatIconName }> = [
  { format: 'pdf-native', label: 'PDF Snapshot', description: 'Native report PDF, saved to Reports', icon: 'document' },
  { format: 'html', label: 'HTML', description: 'Rich styled report, viewable in any browser', icon: 'web' },
  { format: 'pdf', label: 'Print PDF', description: 'Print-ready via browser print dialog', icon: 'print' },
  { format: 'csv', label: 'CSV', description: 'Opens in Excel, Google Sheets, etc.', icon: 'table' },
];

type ReportFormatIconName = 'document' | 'web' | 'print' | 'table';

export function ReportFormatIcon({ format }: { format: ReportFormatIconName }) {
  const paths = format === 'web' ? <><path d="M4 4h16v16H4z" /><path d="M4 9h16M9 9v11" /></>
    : format === 'table' ? <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18" /></>
      : <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{paths}</svg>;
}

export function ReportFormatPicker({ onSelect, onCancel }: { onSelect: (format: ReportFormat) => void; onCancel: () => void }) {
  return (
    <div className="report-overlay" onClick={onCancel}>
      <div className="rp-format-picker" onClick={(event) => event.stopPropagation()}>
        <h3 className="rp-format-title">Choose Report Format</h3>
        <div className="rp-format-options">
          {REPORT_FORMATS.map(({ format, label, description, icon }) => (
            <button className="rp-format-btn" key={format} onClick={() => onSelect(format)}>
              <span className="rp-format-icon"><ReportFormatIcon format={icon} /></span>
              <div><span className="rp-format-label">{label}</span><span className="rp-format-desc">{description}</span></div>
            </button>
          ))}
        </div>
        <button className="rp-format-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
