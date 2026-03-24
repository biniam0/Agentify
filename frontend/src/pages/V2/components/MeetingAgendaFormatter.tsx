import { Video, Phone, User, Mail, ExternalLink } from 'lucide-react';

interface ParsedAgenda {
  note: string | null;
  contacts: { name: string; role?: string; email?: string; phone?: string }[];
  teamsLink: string | null;
  dialIn: { number: string; id?: string; passcode?: string } | null;
}

const NOISE_PATTERNS = [
  /Microsoft Teams/i,
  /Heeft u hulp nodig/i,
  /Nu deelnemen aan de vergadering/i,
  /Vergadering-id:/i,
  /Wachtwoordcode:/i,
  /Inbellen via telefoon/i,
  /Een lokaal nummer zoeken/i,
  /Telefonische vergadering-id/i,
  /Voor organisatoren/i,
  /Vergaderopties/i,
  /Pincode voor inbellen/i,
  /Deze e-mail, inclusief bijlagen/i,
  /vertrouwelijk en enkel bedoeld/i,
  /Indien u niet de beoogde ontvanger/i,
  /Het is verboden deze e-mail/i,
  /Wij zijn niet aansprakelijk/i,
  /https:\/\/assets\./i,
  /^\s*_{3,}\s*$/,
  /^\s*-{3,}\s*$/,
  /^\[https?:\/\//i,
];

function parseAgenda(raw: string): ParsedAgenda {
  const result: ParsedAgenda = { note: null, contacts: [], teamsLink: null, dialIn: null };

  const teamsMatch = raw.match(/https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s>)]+/);
  if (teamsMatch) result.teamsLink = teamsMatch[0];

  const dialMatch = raw.match(/(\+\d[\d\s-]+\d),/);
  if (dialMatch) {
    const num = dialMatch[1].replace(/\s+/g, ' ').trim();
    const idMatch = raw.match(/Telefonische vergadering-id:\s*([\d\s#]+)/i) ||
                    raw.match(/Conference ID:\s*([\d\s#]+)/i);
    const passMatch = raw.match(/Wachtwoordcode:\s*(\S+)/i) || raw.match(/Passcode:\s*(\S+)/i);
    result.dialIn = {
      number: num,
      id: idMatch?.[1]?.trim(),
      passcode: passMatch?.[1]?.trim(),
    };
  }

  const emailMatches = raw.match(/[\w.+-]+@[\w.-]+\.\w{2,}/g) || [];
  const phoneMatches = raw.match(/(?:\+\d{1,3}[\s-]?)?(?:\d[\s-]?){6,}/g) || [];
  const nameRoleMatch = raw.match(/(?:Vriendelijke groet,?\s*)([\s\S]*?)(?=\s*(?:E-mail:|Mobiel:|Tel:|$))/i);

  if (nameRoleMatch) {
    const block = nameRoleMatch[1].trim();
    const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const contact: ParsedAgenda['contacts'][0] = { name: lines[0] };
      if (lines.length > 1) contact.role = lines.slice(1).join(', ');

      const contactEmail = emailMatches.find(e => !e.includes('teams') && !e.includes('microsoft'));
      if (contactEmail) contact.email = contactEmail;

      const mobileMatch = raw.match(/Mobiel:\s*([\d\s+()-]+)/i) || raw.match(/Tel:\s*([\d\s+()-]+)/i);
      if (mobileMatch) contact.phone = mobileMatch[1].trim();
      else if (phoneMatches.length > 0) {
        const nonDialIn = phoneMatches.find(p => !p.includes('20 708'));
        if (nonDialIn) contact.phone = nonDialIn.trim();
      }

      result.contacts.push(contact);
    }
  }

  const lines = raw.split(/\n/);
  const noteLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (NOISE_PATTERNS.some(p => p.test(trimmed))) break;
    if (trimmed.startsWith('Vriendelijke groet') || trimmed.startsWith('Kind regards')) break;
    if (trimmed.startsWith('<') && trimmed.includes('http')) continue;
    if (/^https?:\/\//.test(trimmed)) continue;
    noteLines.push(trimmed);
  }
  if (noteLines.length > 0) {
    result.note = noteLines.join('\n');
  }

  return result;
}

function isRichAgenda(text: string): boolean {
  return text.includes('Microsoft Teams') ||
    text.includes('Vriendelijke groet') ||
    text.includes('Kind regards') ||
    text.includes('teams.microsoft.com') ||
    text.includes('E-mail:') ||
    /_{5,}/.test(text);
}

interface MeetingAgendaProps {
  agenda: string;
  variant?: 'compact' | 'full';
}

const MeetingAgendaFormatter = ({ agenda, variant = 'full' }: MeetingAgendaProps) => {
  if (!isRichAgenda(agenda)) {
    return (
      <p className={variant === 'compact' ? 'text-xs text-subtle line-clamp-2' : 'text-sm text-body leading-relaxed'}>
        {agenda}
      </p>
    );
  }

  const parsed = parseAgenda(agenda);

  if (variant === 'compact') {
    return (
      <div className="space-y-1">
        {parsed.note && (
          <p className="text-xs text-subtle line-clamp-2">{parsed.note}</p>
        )}
        {parsed.teamsLink && (
          <span className="inline-flex items-center gap-1 text-[10px] text-blue-600">
            <Video className="h-3 w-3" />
            Teams meeting
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {parsed.note && (
        <p className="text-sm text-body leading-relaxed">{parsed.note}</p>
      )}

      {(parsed.teamsLink || parsed.dialIn) && (
        <div className="flex flex-wrap gap-2">
          {parsed.teamsLink && (
            <a
              href={parsed.teamsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Video className="h-3.5 w-3.5" />
              Join Teams Meeting
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {parsed.dialIn && (
            <a
              href={`tel:${parsed.dialIn.number.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              Dial In: {parsed.dialIn.number}
            </a>
          )}
        </div>
      )}

      {parsed.contacts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {parsed.contacts.map((contact, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs">
              <div className="h-6 w-6 rounded-full bg-brand-light flex items-center justify-center flex-shrink-0">
                <User className="h-3 w-3 text-brand" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-heading">{contact.name}</p>
                {contact.role && <p className="text-subtle truncate">{contact.role}</p>}
              </div>
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="text-subtle hover:text-heading transition-colors ml-1" title={contact.email}>
                  <Mail className="h-3.5 w-3.5" />
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="text-subtle hover:text-heading transition-colors" title={contact.phone}>
                  <Phone className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {parsed.dialIn?.id && (
        <div className="flex items-center gap-3 text-[11px] text-subtle">
          {parsed.dialIn.id && <span>Conference ID: {parsed.dialIn.id}</span>}
          {parsed.dialIn.passcode && <span>Passcode: {parsed.dialIn.passcode}</span>}
        </div>
      )}
    </div>
  );
};

export default MeetingAgendaFormatter;
