import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import type { CompanySettingsFormData } from "@/lib/validations/companySettings";

interface GeneralInfoFormProps {
  form: UseFormReturn<CompanySettingsFormData>;
}

export function GeneralInfoForm({ form }: GeneralInfoFormProps) {
  const { register, formState: { errors }, setValue, watch } = form;
  
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#00d4aa]" />
          Company Identity
        </CardTitle>
        <CardDescription className="text-slate-400">
          Legal business information and contact details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="companyName" className="text-slate-300">
            Company Name <span className="text-red-400">*</span>
          </Label>
          <Input
            id="companyName"
            {...register("companyName")}
            className="bg-slate-800 border-slate-600 text-white"
            placeholder="NextDoor Exterior Solutions"
          />
          {errors.companyName && (
            <p className="text-xs text-red-400">{errors.companyName.message}</p>
          )}
        </div>

        {/* Legal Entity Type */}
        <div className="space-y-2">
          <Label htmlFor="legalEntityType" className="text-slate-300">
            Legal Entity Type
          </Label>
          <Select
            value={watch("legalEntityType") || ""}
            onValueChange={(value) => setValue("legalEntityType", value as any)}
          >
            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
              <SelectValue placeholder="Select entity type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="LLC" className="text-white">LLC</SelectItem>
              <SelectItem value="Inc" className="text-white">Inc</SelectItem>
              <SelectItem value="Corp" className="text-white">Corp</SelectItem>
              <SelectItem value="Sole Proprietor" className="text-white">Sole Proprietor</SelectItem>
              <SelectItem value="Partnership" className="text-white">Partnership</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* DBA Name */}
        <div className="space-y-2">
          <Label htmlFor="dbaName" className="text-slate-300">
            DBA Name (if different)
          </Label>
          <Input
            id="dbaName"
            {...register("dbaName")}
            className="bg-slate-800 border-slate-600 text-white"
            placeholder="Doing Business As"
          />
        </div>

        {/* Company Email */}
        <div className="space-y-2">
          <Label htmlFor="companyEmail" className="text-slate-300">
            Company Email
          </Label>
          <Input
            id="companyEmail"
            type="email"
            {...register("companyEmail")}
            className="bg-slate-800 border-slate-600 text-white"
            placeholder="info@company.com"
          />
          {errors.companyEmail && (
            <p className="text-xs text-red-400">{errors.companyEmail.message}</p>
          )}
        </div>

        {/* Company Phone */}
        <div className="space-y-2">
          <Label htmlFor="companyPhone" className="text-slate-300">
            Company Phone
          </Label>
          <Input
            id="companyPhone"
            {...register("companyPhone")}
            className="bg-slate-800 border-slate-600 text-white"
            placeholder="(555) 123-4567"
          />
          {errors.companyPhone && (
            <p className="text-xs text-red-400">{errors.companyPhone.message}</p>
          )}
        </div>

        {/* Website URL */}
        <div className="space-y-2">
          <Label htmlFor="websiteUrl" className="text-slate-300">
            Website URL
          </Label>
          <Input
            id="websiteUrl"
            type="url"
            {...register("websiteUrl")}
            className="bg-slate-800 border-slate-600 text-white"
            placeholder="https://www.company.com"
          />
          {errors.websiteUrl && (
            <p className="text-xs text-red-400">{errors.websiteUrl.message}</p>
          )}
        </div>

        {/* Address Fields */}
        <div className="space-y-2">
          <Label htmlFor="address" className="text-slate-300">
            Street Address <span className="text-red-400">*</span>
          </Label>
          <Input
            id="address"
            {...register("address")}
            className="bg-slate-800 border-slate-600 text-white"
            placeholder="123 Main Street"
          />
          {errors.address && (
            <p className="text-xs text-red-400">{errors.address.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="city" className="text-slate-300">
              City <span className="text-red-400">*</span>
            </Label>
            <Input
              id="city"
              {...register("city")}
              className="bg-slate-800 border-slate-600 text-white"
            />
            {errors.city && (
              <p className="text-xs text-red-400">{errors.city.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="state" className="text-slate-300">
              State <span className="text-red-400">*</span>
            </Label>
            <Input
              id="state"
              {...register("state")}
              className="bg-slate-800 border-slate-600 text-white"
              placeholder="FL"
              maxLength={2}
            />
            {errors.state && (
              <p className="text-xs text-red-400">{errors.state.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="zipCode" className="text-slate-300">
              ZIP <span className="text-red-400">*</span>
            </Label>
            <Input
              id="zipCode"
              {...register("zipCode")}
              className="bg-slate-800 border-slate-600 text-white"
              placeholder="33101"
            />
            {errors.zipCode && (
              <p className="text-xs text-red-400">{errors.zipCode.message}</p>
            )}
          </div>
        </div>

        {/* Tax ID */}
        <div className="space-y-2">
          <Label htmlFor="taxId" className="text-slate-300">
            Tax ID / EIN
          </Label>
          <Input
            id="taxId"
            {...register("taxId")}
            className="bg-slate-800 border-slate-600 text-white"
            placeholder="XX-XXXXXXX"
          />
          {errors.taxId && (
            <p className="text-xs text-red-400">{errors.taxId.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
