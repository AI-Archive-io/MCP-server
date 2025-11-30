#!/usr/bin/env node

/**
 * Test script for modular MCP server
 * Validates module loading and basic functionality without requiring stdio transport
 */

import { ToolLoader } from './src/utils/toolLoader.js';

async function testModularSystem() {
  console.log('🧪 Testing AI-Archive MCP Server Modular System\n');
  
  try {
    // Test 1: Tool Loader Initialization
    console.log('1️⃣ Testing ToolLoader initialization...');
    const toolLoader = new ToolLoader();
    console.log('   ✅ ToolLoader created successfully');
    
    // Test 2: Configuration Loading
    console.log('\n2️⃣ Testing configuration loading...');
    const config = toolLoader.config;
    console.log(`   ✅ Configuration loaded with ${Object.keys(config.enabledModules).length} modules`);
    
    // Test 3: Module Loading
    console.log('\n3️⃣ Testing module loading...');
    const { tools, handlers } = await toolLoader.loadAllModules();
    console.log(`   ✅ Loaded ${tools.length} tools from ${toolLoader.getLoadedModules().length} modules`);
    
    // Test 4: Tool Validation
    console.log('\n4️⃣ Testing tool validation...');
    toolLoader.validateAllTools();
    console.log('   ✅ All tools passed validation');
    
    // Test 5: Module Information
    console.log('\n5️⃣ Testing module information retrieval...');
    const moduleInfo = toolLoader.getAllModuleInfo();
    console.log(`   ✅ Retrieved info for ${moduleInfo.length} modules`);
    
    // Test 6: Tool Lookup
    console.log('\n6️⃣ Testing tool lookup functionality...');
    const searchTool = toolLoader.getToolByName('search_papers');
    const searchHandler = toolLoader.getHandlerByName('search_papers');
    
    if (searchTool && searchHandler) {
      console.log('   ✅ Tool lookup working correctly');
    } else {
      throw new Error('Tool lookup failed');
    }
    
    // Test 7: Statistics
    console.log('\n7️⃣ Testing statistics generation...');
    const stats = toolLoader.getStats();
    console.log(`   ✅ Stats: ${stats.totalModules} modules, ${stats.totalTools} tools, ${stats.totalHandlers} handlers`);
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log('==========================================');
    console.log(`✅ All tests passed successfully!`);
    console.log(`📦 Modules loaded: ${toolLoader.getLoadedModules().join(', ')}`);
    console.log(`🔧 Total tools available: ${tools.length}`);
    console.log(`⚙️  Total handlers registered: ${Object.keys(handlers).length}`);
    console.log('==========================================');
    
    // Detailed breakdown
    console.log('\n📋 Detailed Module Breakdown:');
    for (const module of moduleInfo) {
      console.log(`   📁 ${module.name}: ${module.toolCount} tools`);
      console.log(`      Tools: ${module.tools.join(', ')}`);
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testModularSystem()
  .then(success => {
    if (success) {
      console.log('\n🎉 Modular system test completed successfully!');
      process.exit(0);
    } else {
      console.log('\n💥 Modular system test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(`💥 Unexpected error: ${error.message}`);
    process.exit(1);
  });