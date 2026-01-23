import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, ChevronUp, CheckCircle2, MessageSquare, AlertCircle, ArrowDownCircle, ArrowUpCircle, RotateCcw, Calendar, Briefcase, Link as LinkIcon, XCircle } from 'lucide-react';
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
                className="grid grid-cols-12 gap-4 py-4 px-6 items-center hover:bg-page dark:hover:bg-muted transition-colors cursor-pointer"
                onClick={() => onToggle(item.id)}
            >
                <div className="col-span-2">
                    <div className="flex items-center gap-2">
                        {getActivityBadge(item.activityType)}
                        {getDirectionBadge(item.callDirection)}
                    </div>
                </div>
                <div className="col-span-3">
                    <div className="text-sm font-medium text-heading dark:text-foreground truncate">{item.dealName}</div>
                </div>
                <div className="col-span-2">
                    <div className="text-sm text-body dark:text-muted-foreground truncate">{item.companyName}</div>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={item.ownerAvatar} />
                        <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                            {item.ownerName.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-heading dark:text-foreground truncate">{item.ownerName}</span>
                </div>
                <div className="col-span-2">
                    <div className="text-sm text-body dark:text-muted-foreground">
                        {format(new Date(item.date), 'MMM d, yyyy')}
                    </div>
                </div>
                <div className="col-span-1 flex justify-end items-center gap-2">
                    {getStatusBadge(item.status)}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-subtle" /> : <ChevronDown className="h-4 w-4 text-subtle" />}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-6 pb-6 pt-2 bg-page dark:bg-muted/30">
                    <div className="bg-elevated dark:bg-card border border-subtle dark:border-border rounded-lg p-6 space-y-6">

                        {/* Top Action Bar */}
                        <div className="flex justify-between items-center pb-4 border-b border-subtle dark:border-border">
                            <h3 className="text-base font-semibold text-heading dark:text-foreground">Call Details</h3>
                            <div className="flex gap-2">
                                <Button className="bg-brand hover:bg-brand-hover text-white gap-2" size="sm">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Complete
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Comment
                                </Button>
                            </div>
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
                            <div className="space-y-6">
                                {/* Meeting & Deal Context */}
                                <div>
                                    <h4 className="text-sm font-semibold text-body dark:text-foreground mb-3 flex items-center gap-2">
                                        <Briefcase className="h-4 w-4" />
                                        Business Context
                                    </h4>
                                    <div className="space-y-3 bg-page dark:bg-muted/50 rounded-lg p-4 border border-subtle dark:border-border">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-subtle">Deal</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-heading dark:text-foreground">{item.dealName}</span>
                                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-brand hover:text-[hsl(var(--app-brand-hover))] hover:bg-brand-light dark:hover:bg-primary/10">
                                                    <LinkIcon className="h-3 w-3 mr-1" />
                                                    View
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-subtle">Meeting</span>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3 w-3 text-subtle" />
                                                <span className="text-sm font-medium text-heading dark:text-foreground truncate max-w-[200px]">{item.meetingTitle}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Retry Information */}
                                {item.retryAttempt > 1 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-body dark:text-foreground mb-3 flex items-center gap-2">
                                            <RotateCcw className="h-4 w-4" />
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
                                        <h4 className="text-sm font-semibold text-body dark:text-foreground mb-2">Summary</h4>
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
                                <h4 className="text-sm font-semibold text-body dark:text-foreground mb-3">Issues Detected</h4>
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

