/**
 * ProposalPDF Component
 * Generates a professional PDF proposal using @react-pdf/renderer
 */

import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  coverPage: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  coverLogo: {
    width: 200,
    height: 80,
    objectFit: 'contain',
    marginBottom: 60,
  },
  coverTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 40,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 10,
    textAlign: 'center',
  },
  coverName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00d4aa',
    marginBottom: 60,
    textAlign: 'center',
  },
  coverFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#00d4aa',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverFooterText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2 solid #00d4aa',
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: 'contain',
  },
  proposalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  heroSection: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    border: '1 solid #e2e8f0',
  },
  productContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    objectFit: 'cover',
    border: '1 solid #cbd5e1',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  productManufacturer: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  specBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#00d4aa',
    borderRadius: 4,
  },
  specText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00d4aa',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: '2 solid #00d4aa',
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#334155',
    marginBottom: 10,
    textAlign: 'justify',
  },
  customerInfo: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
    width: 100,
  },
  infoValue: {
    fontSize: 10,
    color: '#1e293b',
    flex: 1,
  },
  priceSection: {
    marginTop: 20,
    padding: 25,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    border: '2 solid #00d4aa',
  },
  priceLabel: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  priceValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#00d4aa',
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: '1 solid #e2e8f0',
    fontSize: 9,
    color: '#64748b',
    textAlign: 'center',
  },
  validityNote: {
    fontSize: 10,
    color: '#ef4444',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
});

interface ProposalPDFProps {
  job: any;
  company: any;
  product: any;
  aiContent: {
    scope: string;
    closing: string;
  };
}

export const ProposalPDF = ({ job, company, product, aiContent }: ProposalPDFProps) => {
  // Format price
  const formatPrice = (price: string | number | null | undefined) => {
    if (!price) return '$0.00';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numPrice);
  };

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 60 }}>
          {company?.logo_url && (
            <Image src={company.logo_url} style={styles.coverLogo} />
          )}
          <Text style={styles.coverTitle}>Roofing Replacement Proposal</Text>
          <Text style={styles.coverSubtitle}>Prepared For:</Text>
          <Text style={styles.coverName}>{job.fullName}</Text>
          <Text style={styles.coverSubtitle}>Prepared By:</Text>
          <Text style={styles.coverName}>{company?.companyName || 'Next Door Exterior Solutions'}</Text>
        </View>
        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>License #CCC1334600 | TAMKO Pro Certified</Text>
        </View>
      </Page>

      {/* Main Content Page */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {company?.logo_url ? (
              <Image src={company.logo_url} style={styles.logo} />
            ) : company?.companyName ? (
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#0f172a' }}>
                {company.companyName}
              </Text>
            ) : null}
          </View>
          <Text style={styles.proposalTitle}>PROPOSAL</Text>
        </View>

        {/* Customer Information */}
        <View style={styles.customerInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Customer:</Text>
            <Text style={styles.infoValue}>{job.fullName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Property:</Text>
            <Text style={styles.infoValue}>{job.address}, {job.cityStateZip}</Text>
          </View>
          {job.email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{job.email}</Text>
            </View>
          )}
          {job.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{job.phone}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        {/* Hero Section - Product Display */}
        {product && (
          <View style={styles.heroSection}>
            <View style={styles.productContainer}>
              {product.imageUrl && (
                <Image
                  src={product.imageUrl}
                  style={styles.productImage}
                />
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName}>
                  {product.productName} - {product.color}
                </Text>
                <Text style={styles.productManufacturer}>
                  by {product.manufacturer}
                </Text>
                <View style={styles.specsRow}>
                  {product.windRating && (
                    <View style={styles.specBadge}>
                      <Text style={styles.specText}>💨 {product.windRating}</Text>
                    </View>
                  )}
                  {product.warrantyInfo && (
                    <View style={styles.specBadge}>
                      <Text style={styles.specText}>🛡️ Warranty</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <Text style={styles.paragraph}>{aiContent.scope}</Text>
        </View>

        {/* Product Specifications */}
        {product && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Specifications</Text>
            {product.windRating && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 11, color: '#334155' }}>
                  <Text style={{ fontWeight: 'bold' }}>Wind Rating:</Text> {product.windRating}
                </Text>
              </View>
            )}
            {product.warrantyInfo && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 11, color: '#334155' }}>
                  <Text style={{ fontWeight: 'bold' }}>Warranty:</Text> {product.warrantyInfo}
                </Text>
              </View>
            )}
            {product.description && (
              <Text style={{ fontSize: 11, color: '#334155', marginTop: 5 }}>
                {product.description}
              </Text>
            )}
          </View>
        )}

        {/* Investment */}
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Total Investment</Text>
          <Text style={styles.priceValue}>{formatPrice(job.totalPrice)}</Text>
        </View>

        {/* Closing Statement */}
        <View style={styles.section}>
          <Text style={styles.paragraph}>{aiContent.closing}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {company && (
            <>
              {company.streetAddress && (
                <Text>{company.streetAddress}</Text>
              )}
              {company.city && company.state && company.zipCode && (
                <Text>{company.city}, {company.state} {company.zipCode}</Text>
              )}
              {company.phoneNumber && (
                <Text style={{ marginTop: 5 }}>Phone: {company.phoneNumber}</Text>
              )}
              {company.email && (
                <Text>Email: {company.email}</Text>
              )}
            </>
          )}
          <Text style={styles.validityNote}>
            This proposal is valid for 30 days from the date above
          </Text>
        </View>
      </Page>
    </Document>
  );
};
