const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('⚡ SEEDING WATCH SPECIFICATIONS & FEEDING WATCH TECHNICAL DETAILS...');

    // 1. Define Groups
    const groupsData = [
        { id: 1, name: 'Movement & Performance', sortOrder: 1 },
        { id: 2, name: 'Case & Dimensions', sortOrder: 2 },
        { id: 3, name: 'Dial & Crystal', sortOrder: 3 },
        { id: 4, name: 'Strap & Clasp', sortOrder: 4 },
        { id: 5, name: 'General & Warranty', sortOrder: 5 }
    ];

    const groupMap = {};
    for (const g of groupsData) {
        const group = await prisma.specificationGroup.upsert({
            where: { id: g.id },
            update: { name: g.name, sortOrder: g.sortOrder },
            create: { id: g.id, name: g.name, sortOrder: g.sortOrder }
        });
        groupMap[g.name] = group;
    }
    console.log('✅ Specification Groups ready.');

    // 2. Define Specifications under groups
    const specsData = [
        // Movement & Performance
        { groupName: 'Movement & Performance', name: 'Movement Calibre', code: 'spec_calibre', type: 'text', defaultValue: 'Automatic Calibre FY-9001' },
        { groupName: 'Movement & Performance', name: 'Power Reserve', code: 'spec_power_reserve', type: 'text', defaultValue: '72 Hours' },
        { groupName: 'Movement & Performance', name: 'Water Resistance', code: 'spec_water_resistance', type: 'text', defaultValue: '10 ATM / 100 Meters' },
        { groupName: 'Movement & Performance', name: 'Frequency', code: 'spec_frequency', type: 'text', defaultValue: '28,800 vph (4 Hz)' },
        { groupName: 'Movement & Performance', name: 'Jewels', code: 'spec_jewels', type: 'text', defaultValue: '31 Jewels' },

        // Case & Dimensions
        { groupName: 'Case & Dimensions', name: 'Case Diameter', code: 'spec_case_diameter', type: 'text', defaultValue: '41.0 mm' },
        { groupName: 'Case & Dimensions', name: 'Case Thickness', code: 'spec_case_thickness', type: 'text', defaultValue: '11.5 mm' },
        { groupName: 'Case & Dimensions', name: 'Case Material', code: 'spec_case_material', type: 'text', defaultValue: '316L Surgical Grade Stainless Steel' },
        { groupName: 'Case & Dimensions', name: 'Lug Width', code: 'spec_lug_width', type: 'text', defaultValue: '20.0 mm' },
        { groupName: 'Case & Dimensions', name: 'Case Back', code: 'spec_case_back', type: 'text', defaultValue: 'Transparent Exhibition Sapphire Back' },

        // Dial & Crystal
        { groupName: 'Dial & Crystal', name: 'Dial Finish', code: 'spec_dial_finish', type: 'text', defaultValue: 'Sunburst Satin Finish with Applied Hour Markers' },
        { groupName: 'Dial & Crystal', name: 'Crystal / Glass', code: 'spec_crystal', type: 'text', defaultValue: 'Scratch-Resistant Sapphire Crystal with AR Coating' },
        { groupName: 'Dial & Crystal', name: 'Luminescence', code: 'spec_lume', type: 'text', defaultValue: 'Super-LumiNova BGW9 (Blue Glow)' },

        // Strap & Clasp
        { groupName: 'Strap & Clasp', name: 'Strap Material', code: 'spec_strap_material', type: 'text', defaultValue: 'Genuine Hand-Stitched Italian Leather' },
        { groupName: 'Strap & Clasp', name: 'Clasp Type', code: 'spec_clasp_type', type: 'text', defaultValue: 'Deployant Butterfly Buckle with Safety Push Buttons' },

        // General & Warranty
        { groupName: 'General & Warranty', name: 'Warranty', code: 'spec_warranty', type: 'text', defaultValue: '5 Years International Warranty' },
        { groupName: 'General & Warranty', name: 'Country of Origin', code: 'spec_origin', type: 'text', defaultValue: 'Swiss Precision Craftsmanship' }
    ];

    const specMap = {};
    for (let i = 0; i < specsData.length; i++) {
        const s = specsData[i];
        const group = groupMap[s.groupName];
        
        const spec = await prisma.specification.upsert({
            where: { code: s.code },
            update: { name: s.name, type: s.type, isActive: true },
            create: { name: s.name, code: s.code, type: s.type, isActive: true, sortOrder: i + 1 }
        });

        // Link to Group
        await prisma.specGroupSpec.upsert({
            where: {
                specificationGroupId_specificationId: {
                    specificationGroupId: group.id,
                    specificationId: spec.id
                }
            },
            update: { sortOrder: i + 1 },
            create: {
                specificationGroupId: group.id,
                specificationId: spec.id,
                sortOrder: i + 1
            }
        });

        specMap[s.code] = { spec, defaultValue: s.defaultValue };
    }
    console.log('✅ Specifications & Group Links ready.');

    // 3. Link All Specification Groups to All Categories
    const categories = await prisma.category.findMany();
    console.log(`📦 Linking Specification Groups to ${categories.length} Categories...`);
    for (const cat of categories) {
        for (const g of groupsData) {
            await prisma.categorySpecGroup.upsert({
                where: {
                    categoryId_specificationGroupId: {
                        categoryId: cat.id,
                        specificationGroupId: g.id
                    }
                },
                update: {},
                create: {
                    categoryId: cat.id,
                    specificationGroupId: g.id
                }
            });
        }
    }
    console.log('✅ Category Specification Groups linked.');

    // 4. Feed Product Specifications for All Products
    const products = await prisma.product.findMany();
    console.log(`⌚ Feeding Technical Details for ${products.length} Watches...`);

    // Specific preset details for different products to make them look authentic
    const presetSpecsMap = {
        'spec_calibre': ['Automatic Calibre FY-9001', 'In-House Chronometer FY-802', 'High-Precision Automatic FY-700', 'Hand-Wound Mechanical FY-100'],
        'spec_power_reserve': ['72 Hours', '48 Hours', '80 Hours', '60 Hours'],
        'spec_water_resistance': ['10 ATM / 100 Meters', '20 ATM / 200 Meters (Diver)', '5 ATM / 50 Meters', '30 ATM / 300 Meters'],
        'spec_case_diameter': ['41.0 mm', '39.0 mm', '42.0 mm', '40.0 mm'],
        'spec_case_thickness': ['11.5 mm', '10.8 mm', '12.2 mm', '11.0 mm'],
        'spec_case_material': ['316L Surgical Grade Stainless Steel', 'Grade 5 Titanium', '18K Rose Gold Plated Stainless Steel', 'Ceramic & Stainless Steel'],
        'spec_lug_width': ['20.0 mm', '22.0 mm', '20.0 mm', '19.0 mm'],
        'spec_dial_finish': ['Sunburst Satin Finish with Applied Hour Markers', 'Matte Velvet Black with Luminous Hands', 'Enamel Glossy White', 'Guilloché Patterned Dial'],
        'spec_crystal': ['Scratch-Resistant Sapphire Crystal with AR Coating', 'Double-Domed Sapphire Crystal', 'Anti-Reflective Sapphire Glass'],
        'spec_lume': ['Super-LumiNova BGW9 (Blue Glow)', 'Super-LumiNova C3 (Green Glow)', 'Swiss Luminova Dial Highlights'],
        'spec_strap_material': ['Genuine Hand-Stitched Italian Leather', '316L Stainless Steel Oyster Bracelet', 'Premium Fluororubber Sport Strap'],
        'spec_clasp_type': ['Deployant Butterfly Buckle', 'Folding Clasp with Safety Micro-Adjustment', 'Classic Stainless Buckle'],
        'spec_warranty': ['5 Years International Warranty', '3 Years Comprehensive Warranty'],
        'spec_origin': ['Swiss Craftsmanship Standards', 'Hand-Assembled Precision Horology']
    };

    for (let pIdx = 0; pIdx < products.length; pIdx++) {
        const prod = products[pIdx];

        for (const code of Object.keys(specMap)) {
            const item = specMap[code];
            const presets = presetSpecsMap[code] || [item.defaultValue];
            const val = presets[pIdx % presets.length] || item.defaultValue;

            // Delete existing specification record for this product + spec combo
            await prisma.productSpecification.deleteMany({
                where: {
                    productId: prod.id,
                    specificationId: item.spec.id
                }
            });

            // Insert product specification value
            await prisma.productSpecification.create({
                data: {
                    productId: prod.id,
                    specificationId: item.spec.id,
                    value: val
                }
            });
        }
    }

    console.log('✨ FULL WATCH SPECIFICATIONS SEED COMPLETED SUCCESSFULLY!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding specifications:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
