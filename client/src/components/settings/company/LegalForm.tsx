import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import type { CompanySettingsFormData } from "@/lib/validations/companySettings";

interface LegalFormProps {
  form: UseFormReturn<CompanySettingsFormData>;
}

export function LegalForm({ form }: LegalFormProps) {
  const { register, formState: { errors }, watch } = form;
  
  const termsLength = watch("termsAndConditions")?.length || 0;

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#00d4aa]" />
          Legal & Compliance
        </CardTitle>
        <CardDescription className="text-slate-400">
          Default terms and conditions for proposals and contracts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Terms and Conditions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="termsAndConditions" className="text-slate-300">
              Terms & Conditions
            </Label>
            <span className="text-xs text-slate-500">
              {termsLength} / 10,000 characters
            </span>
          </div>
          <Textarea
            id="termsAndConditions"
            {...register("termsAndConditions")}
            className="bg-slate-800 border-slate-600 text-white min-h-[200px] font-mono text-sm"
            placeholder="Enter your standard terms and conditions here. This will appear on all proposals and contracts.

Example:
1. Payment Terms: 50% deposit required, balance due upon completion.
2. Warranty: 10-year labor warranty, manufacturer's warranty on materials.
3. Permits: All necessary permits will be obtained by the contractor.
4. Change Orders: Any changes to scope must be approved in writing.
5. Cancellation: 48-hour notice required for cancellation."
          />
          {errors.termsAndConditions && (
            <p className="text-xs text-red-400">{errors.termsAndConditions.message}</p>
          )}
          <p className="text-xs text-slate-500">
            Minimum 50 characters required for legal validity. Plain text only (no rich formatting).
          </p>
        </div>

        {/* Cancellation Policy */}
        <div className="space-y-2">
          <Label htmlFor="cancellationPolicy" className="text-slate-300">
            Cancellation Policy
          </Label>
          <Textarea
            id="cancellationPolicy"
            {...register("cancellationPolicy")}
            className="bg-slate-800 border-slate-600 text-white min-h-[100px]"
            placeholder="e.g., Cancellations must be made 48 hours in advance. Deposits are non-refundable after work begins."
          />
        </div>

        {/* Privacy Policy URL */}
        <div className="space-y-2">
          <Label htmlFor="privacyPolicyUrl" className="text-slate-300">
            Privacy Policy URL
          </Label>
          <Input
            id="privacyPolicyUrl"
            type="url"
            {...register("privacyPolicyUrl")}
            className="bg-slate-800 border-slate-600 text-white"
            placeholder="https://www.company.com/privacy"
          />
          {errors.privacyPolicyUrl && (
            <p className="text-xs text-red-400">{errors.privacyPolicyUrl.message}</p>
          )}
          <p className="text-xs text-slate-500">
            Link to your website's privacy policy (optional)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
