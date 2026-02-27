import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, ChevronUp, CheckCircle2, MessageSquare, AlertCircle, ArrowDownCircle, ArrowUpCircle, RotateCcw, Calendar, Briefcase, Link as LinkIcon, XCircle, Voicemail } from 'lucide-react';
import { format } from 'date-fns';
import { CallTimeline } from './CallTimeline';

// --- Log Row ---
export interface LogItem {
    id: string;
    activityType: string; // e.g., 'pre-meeting'
    dealName: string;
    dealId: string;
    companyName: string;
    ownerName: string;
    ownerAvatar?: string;
    date: string;
    status: string; // 'New', 'Waiting', 'Complete'
    description?: string;

    // Tier 1: Timeline data
    initiatedAt: string;
    answeredAt?: string;
    completedAt?: string;
    duration?: number;

    // Tier 1: Retry info
    retryAttempt: number;
    maxRetries: number;
    parentCallId?: string;

    // Tier 1: Meeting/Deal context
    meetingId: string;
    meetingTitle: string;

    // Tier 1: Call direction
    callDirection: 'INBOUND' | 'OUTBOUND';

    // Tier 1: Voicemail detection
    wasVoicemail?: boolean;

    details?: {
        action: string;
        contact: string;
        role: string;
        companyName?: string;
    }[];
}

interface LogTableRowProps {
    item: LogItem;
    onToggle: (id: string) => void;
    isExpanded: boolean;
}

export const LogTableRow: React.FC<LogTableRowProps> = ({ item, onToggle, isExpanded }) => {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return (
                    <Badge variant="outline" className="badge-success border-[hsl(var(--status-success-bg)/0.3)] font-normal">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                    </Badge>
                );
            case 'FAILED':
                return (
                    <Badge variant="outline" className="badge-error border-[hsl(var(--status-error-bg)/0.3)] font-normal">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                    </Badge>
                );
            case 'NO_ANSWER':
                return (
                    <Badge variant="outline" className="badge-warning border-[hsl(var(--status-warning-bg)/0.3)] font-normal">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        No Answer
                    </Badge>
                );
            case 'BUSY':
                return (
                    <Badge variant="outline" className="badge-pending border-[hsl(var(--status-pending-bg)/0.3)] font-normal">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Busy
                    </Badge>
                );
            case 'ANSWERED':
                return (
                    <Badge variant="outline" className="badge-info border-[hsl(var(--status-info-bg)/0.3)] font-normal">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        In Progress
                    </Badge>
                );
            case 'RINGING':
            case 'INITIATED':
                return (
                    <Badge variant="outline" className="bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-400 dark:border-cyan-800 font-normal">
                        Ringing
                    </Badge>
                );
            default:
                return <Badge variant="outline" className="text-body font-normal">{status}</Badge>;
        }
    };

    const getActivityBadge = (type: string) => {
        // Capitalize properly: pre-call → Pre-Call, post-call → Post-Call
        const displayText = type.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join('-');

        return (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-default dark:border-border bg-elevated dark:bg-card text-xs font-medium text-body dark:text-foreground">
                <span className={`w-1.5 h-1.5 rounded-full ${type.includes('pre') ? 'bg-[hsl(var(--icon-orange))]' : 'bg-[hsl(var(--status-error-bg))]'}`} />
                {displayText}
            </div>
        );
    };

    const getDirectionBadge = (direction: 'INBOUND' | 'OUTBOUND') => {
        return direction === 'INBOUND' ? (
            <Badge variant="outline" className="badge-info border-[hsl(var(--status-info-bg)/0.3)] p-1 h-6 w-6 flex items-center justify-center" title="Inbound">
                <ArrowDownCircle className="h-3.5 w-3.5" />
            </Badge>
        ) : (
            <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800 p-1 h-6 w-6 flex items-center justify-center" title="Outbound">
                <ArrowUpCircle className="h-3.5 w-3.5" />
            </Badge>
        );
    };

    return (
        <div className="border-b border-subtle dark:border-border last:border-0">
            {/* Main Row */}
            <div
                className="grid grid-cols-12 gap-4 py-3.5 px-6 items-center hover:bg-[hsl(var(--page-bg)/0.5)] dark:hover:bg-muted/50 transition-colors duration-150 cursor-pointer group"
                onClick={() => onToggle(item.id)}
            >
                <div className="col-span-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {getActivityBadge(item.activityType)}
                        {getDirectionBadge(item.callDirection)}
                        {item.wasVoicemail && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800 px-1.5 py-0.5 text-[10px]" title="Voicemail">
                                <Voicemail className="h-2.5 w-2.5 mr-0.5" />
                                VM
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="col-span-3">
                    <div className="text-sm font-medium text-heading dark:text-foreground truncate">{item.dealName}</div>
                </div>
                <div className="col-span-2">
                    <div className="text-sm text-body dark:text-muted-foreground truncate">{item.companyName}</div>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                    <Avatar className="h-6 w-6 ring-1 ring-[hsl(var(--border-subtle))] dark:ring-border">
                        <AvatarImage src={item.ownerAvatar} />
                        <AvatarFallback className="text-[10px] font-semibold bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300">
                            {item.ownerName.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-heading dark:text-foreground truncate">{item.ownerName}</span>
                </div>
                <div className="col-span-2">
                    <div className="text-xs text-body dark:text-muted-foreground">
                        {format(new Date(item.date), 'MMM d, yyyy')}
                    </div>
                </div>
                <div className="col-span-1 flex justify-end items-center gap-2">
                    {getStatusBadge(item.status)}
                    <div className="text-subtle group-hover:text-heading dark:group-hover:text-foreground transition-colors">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-6 pb-5 pt-1 bg-[hsl(var(--page-bg)/0.5)] dark:bg-muted/20">
                    <div className="bg-elevated dark:bg-card border border-default dark:border-border rounded-lg p-5 space-y-5 shadow-sm">

                        {/* Top Action Bar */}
                        <div className="flex justify-between items-center pb-4 border-b border-subtle dark:border-border">
                            <h3 className="text-sm font-semibold text-heading dark:text-foreground">Call Details</h3>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column: Timeline */}
                            <div>
                                <CallTimeline
                                    initiatedAt={item.initiatedAt}
                                    answeredAt={item.answeredAt}
                                    completedAt={item.completedAt}
                                    duration={item.duration}
                                />
                            </div>

                            {/* Right Column: Context & Info */}
                            <div className="space-y-5">
                                {/* Meeting & Deal Context */}
                                <div>
                                    <h4 className="text-xs font-semibold text-subtle dark:text-muted-foreground mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                                        <Briefcase className="h-3.5 w-3.5" />
                                        Business Context
                                    </h4>
                                    <div className="space-y-2.5 bg-page dark:bg-muted/50 rounded-lg p-4 border border-subtle dark:border-border">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-subtle">Deal</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-heading dark:text-foreground">{item.dealName}</span>
                                                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-brand hover:text-[hsl(var(--app-brand-hover))] hover:bg-brand-light dark:hover:bg-primary/10">
                                                    <LinkIcon className="h-3 w-3 mr-1" />
                                                    View
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-subtle">Meeting</span>
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3 w-3 text-subtle" />
                                                <span className="text-sm font-medium text-heading dark:text-foreground truncate max-w-[200px]">{item.meetingTitle}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Retry Information */}
                                {item.retryAttempt > 1 && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-subtle dark:text-muted-foreground mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                                            <RotateCcw className="h-3.5 w-3.5" />
                                            Retry Information
                                        </h4>
                                        <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4 border border-orange-100 dark:border-orange-900">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-orange-900 dark:text-orange-300">
                                                    Retry Attempt {item.retryAttempt} of {item.maxRetries}
                                                </span>
                                                <Badge variant="outline" className="badge-warning border-[hsl(var(--status-warning-bg)/0.3)]">
                                                    Retry
                                                </Badge>
                                            </div>
                                            {item.parentCallId && (
                                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                                    Original Call ID: <code className="bg-orange-100 dark:bg-orange-900/50 px-1.5 py-0.5 rounded">{item.parentCallId.slice(0, 8)}...</code>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                {item.description && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-subtle dark:text-muted-foreground mb-2 uppercase tracking-wider">Summary</h4>
                                        <p className="text-sm text-body dark:text-muted-foreground leading-relaxed bg-page dark:bg-muted/50 rounded-lg p-4 border border-subtle dark:border-border">
                                            {item.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Failure Details (if any) */}
                        {item.details && item.details.length > 0 && (
                            <div className="pt-4 border-t border-subtle dark:border-border">
                                <h4 className="text-xs font-semibold text-subtle dark:text-muted-foreground mb-2.5 uppercase tracking-wider">Issues Detected</h4>
                                <div className="space-y-3">
                                    {item.details.map((detail, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-100 dark:border-red-900">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-red-100 dark:bg-red-900/50 rounded text-red-600 dark:text-red-400">
                                                    <AlertCircle className="h-4 w-4" />
                                                </div>
                                                <span className="text-sm font-medium text-body dark:text-foreground">{detail.action}</span>
                                            </div>
                                            <div className="text-sm text-body dark:text-muted-foreground">{detail.role}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

