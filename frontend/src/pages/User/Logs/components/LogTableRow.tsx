import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, ChevronUp, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

// --- Log Row ---
export interface LogItem {
    id: string;
    activityType: string; // e.g., 'pre-meeting'
    dealName: string;
    companyName: string;
    ownerName: string;
    ownerAvatar?: string;
    date: string;
    status: string; // 'New', 'Waiting', 'Complete'
    description?: string;
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
        switch (status.toLowerCase()) {
            case 'new':
            case 'completed':
                return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 font-normal">New</Badge>; // Matching screenshot 'New' is green
            case 'waiting':
            case 'failed':
                return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 font-normal">Waiting</Badge>;
            default:
                return <Badge variant="outline" className="text-slate-600 font-normal">{status}</Badge>;
        }
    };

    const getActivityBadge = (type: string) => {
        return (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-slate-200 bg-white text-xs font-medium text-slate-700">
                <span className={`w-1.5 h-1.5 rounded-full ${type.includes('pre') ? 'bg-orange-400' : 'bg-red-500'}`} />
                {type}
            </div>
        );
    };

    return (
        <div className="border-b border-slate-100 last:border-0">
            {/* Main Row */}
            <div
                className="grid grid-cols-12 gap-4 py-4 px-6 items-center hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => onToggle(item.id)}
            >
                <div className="col-span-2">
                    {getActivityBadge(item.activityType)}
                </div>
                <div className="col-span-3">
                    <div className="text-sm font-medium text-slate-900 truncate">{item.dealName}</div>
                </div>
                <div className="col-span-2">
                    <div className="text-sm text-slate-600 truncate">{item.companyName}</div>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={item.ownerAvatar} />
                        <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                            {item.ownerName.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-slate-900 truncate">{item.ownerName}</span>
                </div>
                <div className="col-span-2">
                    <div className="text-sm text-slate-600">
                        {format(new Date(item.date), 'MMM d, yyyy')}
                    </div>
                </div>
                <div className="col-span-1 flex justify-end items-center gap-2">
                    {getStatusBadge(item.status)}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-6 pb-6 pt-2 bg-slate-50/50">
                    <div className="bg-white border border-slate-100 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="text-sm font-medium text-slate-500 mb-2">Description</h4>
                                <p className="text-slate-900 text-sm leading-relaxed max-w-2xl">
                                    {item.description || "No description available."}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2" size="sm">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Complete
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Comment
                                </Button>
                            </div>
                        </div>

                        {/* Sub Items (like the list in screenshot) */}
                        {item.details && item.details.length > 0 && (
                            <div className="space-y-3">
                                {item.details.map((detail, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-red-100 rounded text-red-600">
                                                <AlertCircle className="h-4 w-4" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">{detail.action}</span>
                                        </div>
                                        <div className="flex items-center gap-6 text-sm text-slate-500">
                                            <span>{detail.companyName || 'GreyStar'}</span>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarFallback className="text-[8px] bg-orange-100 text-orange-700">PB</AvatarFallback>
                                                </Avatar>
                                                <span className="text-slate-900 font-medium">{detail.contact}</span>
                                            </div>
                                            <span className="w-32 text-right">{detail.role}</span>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100">Waiting</Badge>
                                            <ChevronDown className="h-4 w-4 text-slate-300" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

