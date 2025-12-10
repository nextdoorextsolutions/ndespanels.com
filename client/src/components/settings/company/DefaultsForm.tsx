import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Settings2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import type { CompanySettingsFormData } from "@/lib/validations/companySettings";

interface DefaultsFormProps {
  form: UseFormReturn<CompanySettingsFormData>;
}

export function DefaultsForm({ form }: DefaultsFormProps) {
  const { register, formState: { errors }, setValue, watch } = form;
  
  const depositPercent = watch("defaultDepositPercent") || 50;

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-[#00d4aa]" />
          Business Defaults
        </CardTitle>
        <CardDescription className="text-slate-400">
          Default values for quotes, warranties, and payments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quote Expiration Days */}
        <div className="space-y-2">
          <Label htmlFor="quoteExpirationDays" className="text-slate-300">
            Quote Expiration (Days)
          </Label>
          <Input
            id="quoteExpirationDays"
            type="number"
            {...register("quoteExpirationDays", { valueAsNumber: true })}
            className="bg-slate-800 border-slate-600 text-white"
            min={1}
            max={365}
          />
          {errors.quoteExpirationDays && (
            <p className="text-xs text-red-400">{errors.quoteExpirationDays.message}</p>
          )}
          <p className="text-xs text-slate-500">
            How long quotes remain valid (typically 30-90 days)
          </p>
        </div>

        {/* Labor Warranty Years */}
        <div className="space-y-2">
          <Label htmlFor="laborWarrantyYears" className="text-slate-300">
            Labor Warranty (Years)
          </Label>
          <Input
            id="laborWarrantyYears"
            type="number"
            {...register("laborWarrantyYears", { valueAsNumber: true })}
            className="bg-slate-800 border-slate-600 text-white"
            min={1}
            max={50}
          />
          {errors.laborWarrantyYears && (
            <p className="text-xs text-red-400">{errors.laborWarrantyYears.message}</p>
          )}
        </div>

        {/* Material Warranty Years */}
        <div className="space-y-2">
          <Label htmlFor="materialWarrantyYears" className="text-slate-300">
            Material Warranty (Years)
          </Label>
          <Input
            id="materialWarrantyYears"
            type="number"
            {...register("materialWarrantyYears", { valueAsNumber: true })}
            className="bg-slate-800 border-slate-600 text-white"
            min={1}
            max={50}
          />
          {errors.materialWarrantyYears && (
            <p className="text-xs text-red-400">{errors.materialWarrantyYears.message}</p>
          )}
        </div>

        {/* Default Deposit Percentage */}
        <div className="space-y-3">
          <Label htmlFor="defaultDepositPercent" className="text-slate-300">
            Default Deposit: {depositPercent}%
          </Label>
          <Slider
            value={[depositPercent]}
            onValueChange={(value) => setValue("defaultDepositPercent", value[0])}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-slate-500">
            Typical deposit percentage required upfront
          </p>
        </div>

        {/* Payment Terms */}
        <div className="space-y-2">
          <Label htmlFor="paymentTerms" className="text-slate-300">
            Payment Terms
          </Label>
          <Textarea
            id="paymentTerms"
            {...register("paymentTerms")}
            className="bg-slate-800 border-slate-600 text-white min-h-[80px]"
            placeholder="e.g., 50% deposit, 50% on completion"
          />
          <p className="text-xs text-slate-500">
            Default payment structure for proposals
          </p>
        </div>

        {/* Supplier Defaults */}
        <div className="border-t border-slate-700 pt-4 space-y-4">
          <h4 className="text-sm font-semibold text-slate-300">Supplier Defaults</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="beaconAccountNumber" className="text-slate-300">
                Beacon Account #
              </Label>
              <Input
                id="beaconAccountNumber"
                {...register("beaconAccountNumber")}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="beaconBranchCode" className="text-slate-300">
                Branch Code
              </Label>
              <Input
                id="beaconBranchCode"
                {...register("beaconBranchCode")}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredSupplier" className="text-slate-300">
              Preferred Supplier
            </Label>
            <Input
              id="preferredSupplier"
              {...register("preferredSupplier")}
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultShingleBrand" className="text-slate-300">
              Default Shingle Brand
            </Label>
            <Input
              id="defaultShingleBrand"
              {...register("defaultShingleBrand")}
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
