import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import type { CompanySettingsFormData } from "@/lib/validations/companySettings";

interface CredentialsFormProps {
  form: UseFormReturn<CompanySettingsFormData>;
}

export function CredentialsForm({ form }: CredentialsFormProps) {
  const { register, formState: { errors } } = form;

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#00d4aa]" />
          Credentials & Insurance
        </CardTitle>
        <CardDescription className="text-slate-400">
          Required for proposals and legal compliance (Florida)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contractor License Number */}
        <div className="space-y-2">
          <Label htmlFor="contractorLicenseNumber" className="text-slate-300">
            Contractor License Number <span className="text-red-400">*</span>
          </Label>
          <Input
            id="contractorLicenseNumber"
            {...register("contractorLicenseNumber")}
            className="bg-slate-800 border-slate-600 text-white"
            placeholder="CCC1234567 (Florida format)"
          />
          {errors.contractorLicenseNumber && (
            <p className="text-xs text-red-400">{errors.contractorLicenseNumber.message}</p>
          )}
          <p className="text-xs text-slate-500">
            Florida format: CCC, CGC, CBC, or CRC followed by 7 digits
          </p>
        </div>

        {/* Insurance Policy Number */}
        <div className="space-y-2">
          <Label htmlFor="insurancePolicyNumber" className="text-slate-300">
            Insurance Policy Number <span className="text-red-400">*</span>
          </Label>
          <Input
            id="insurancePolicyNumber"
            {...register("insurancePolicyNumber")}
            className="bg-slate-800 border-slate-600 text-white"
            placeholder="Policy number"
          />
          {errors.insurancePolicyNumber && (
            <p className="text-xs text-red-400">{errors.insurancePolicyNumber.message}</p>
          )}
        </div>

        {/* Insurance Expiration Date */}
        <div className="space-y-2">
          <Label htmlFor="insuranceExpirationDate" className="text-slate-300">
            Insurance Expiration Date <span className="text-red-400">*</span>
          </Label>
          <Input
            id="insuranceExpirationDate"
            type="date"
            {...register("insuranceExpirationDate")}
            className="bg-slate-800 border-slate-600 text-white"
          />
          {errors.insuranceExpirationDate && (
            <p className="text-xs text-red-400">{errors.insuranceExpirationDate.message}</p>
          )}
        </div>

        {/* Insurance Provider */}
        <div className="space-y-2">
          <Label htmlFor="insuranceProvider" className="text-slate-300">
            Insurance Provider
          </Label>
          <Input
            id="insuranceProvider"
            {...register("insuranceProvider")}
            className="bg-slate-800 border-slate-600 text-white"
            placeholder="Insurance company name"
          />
        </div>

        {/* Bonding Information */}
        <div className="space-y-2">
          <Label htmlFor="bondingInfo" className="text-slate-300">
            Bonding Information
          </Label>
          <Textarea
            id="bondingInfo"
            {...register("bondingInfo")}
            className="bg-slate-800 border-slate-600 text-white min-h-[80px]"
            placeholder="Bond number, provider, and coverage amount"
          />
          <p className="text-xs text-slate-500">
            Optional but recommended for commercial projects
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
