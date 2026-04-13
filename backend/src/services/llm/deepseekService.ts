/**
 * DeepSeek LLM Service
 * Phase 1: Foundation - LLM integration for text-to-workflow parsing
 */

import { createDeepSeek } from '@ai-sdk/deepseek';
import { generateText, generateObject } from 'ai';
import { config } from '../../config/env';
import { z } from 'zod';

// ============================================
// DEEPSEEK CLIENT CONFIGURATION
// ============================================

const deepseekProvider = createDeepSeek({
  apiKey: config.deepseek.apiKey,
});

export const getDeepSeekModel = (modelType: 'chat' | 'reasoner' = 'chat') => {
  const modelName = modelType === 'reasoner' ? 'deepseek-reasoner' : 'deepseek-chat';
  return deepseekProvider(modelName);
};

// ============================================
// TEXT GENERATION
// ============================================

/**
 * Generate text completion with DeepSeek
 */
export const generateCompletion = async (params: {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  modelType?: 'chat' | 'reasoner';
}): Promise<string> => {
  const {
    prompt,
    systemPrompt = 'You are a helpful AI assistant for AgentX, a RevOps automation platform.',
    temperature = 0.7,
    maxTokens = 2000,
    modelType = 'chat',
  } = params;

  try {
    console.log('🤖 DeepSeek: Generating completion...');
    console.log(`   Model: deepseek-${modelType}`);
    console.log(`   Prompt length: ${prompt.length} chars`);

    const startTime = Date.now();

    const { text } = await generateText({
      model: getDeepSeekModel(modelType),
      prompt,
      system: systemPrompt,
      temperature,
      // maxTokens, // DeepSeek SDK doesn't support maxTokens directly in generateText yet
    });

    const duration = Date.now() - startTime;
    console.log(`✅ DeepSeek: Completion generated in ${duration}ms`);
    console.log(`   Output length: ${text.length} chars`);

    return text;
  } catch (error: any) {
    console.error('❌ DeepSeek completion error:', error.message);
    throw new Error(`DeepSeek completion failed: ${error.message}`);
  }
};

// ============================================
// STRUCTURED OUTPUT GENERATION
// ============================================

/**
 * Generate structured object with DeepSeek using zod schema
 * This is the core function for parsing NL prompts → workflow JSON
 */
export const generateStructuredOutput = async <T>(params: {
  prompt: string;
  systemPrompt?: string;
  schema: z.ZodSchema<T>;
  temperature?: number;
  modelType?: 'chat' | 'reasoner';
}): Promise<T> => {
  const {
    prompt,
    systemPrompt = 'You are a helpful AI assistant.',
    schema,
    temperature = 0.3, // Lower temp for structured output
    modelType = 'chat',
  } = params;

  try {
    console.log('🤖 DeepSeek: Generating structured output...');
    console.log(`   Model: deepseek-${modelType}`);
    console.log(`   Prompt length: ${prompt.length} chars`);

    const startTime = Date.now();

    const { object } = await generateObject({
      model: getDeepSeekModel(modelType),
      prompt,
      system: systemPrompt,
      schema,
      temperature,
      mode: 'json', // Force JSON output
    });

    const duration = Date.now() - startTime;
    console.log(`✅ DeepSeek: Structured output generated in ${duration}ms`);

    return object as T;
  } catch (error: any) {
    console.error('❌ DeepSeek structured output error:', error.message);
    throw new Error(`DeepSeek structured output failed: ${error.message}`);
  }
};

// ============================================
// BATCH PROCESSING
// ============================================

/**
 * Process multiple prompts in parallel (with rate limiting)
 */
export const generateBatch = async (params: {
  prompts: string[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  maxConcurrent?: number;
}): Promise<string[]> => {
  const { prompts, maxConcurrent = 5, ...otherParams } = params;

  console.log(`🤖 DeepSeek: Batch processing ${prompts.length} prompts (max ${maxConcurrent} concurrent)`);

  const results: string[] = [];
  
  // Process in chunks to avoid rate limits
  for (let i = 0; i < prompts.length; i += maxConcurrent) {
    const chunk = prompts.slice(i, i + maxConcurrent);
    console.log(`   Processing chunk ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(prompts.length / maxConcurrent)}`);
    
    const chunkResults = await Promise.all(
      chunk.map(prompt =>
        generateCompletion({ ...otherParams, prompt })
      )
    );
    
    results.push(...chunkResults);
  }

  console.log(`✅ DeepSeek: Batch complete (${results.length} results)`);
  return results;
};

// ============================================
// STREAMING (Future Enhancement)
// ============================================

/**
 * Stream text generation (for future real-time UI updates)
 * Not implemented in Phase 1 but leaving hook for Phase 5
 */
export const streamCompletion = async (params: {
  prompt: string;
  systemPrompt?: string;
  onChunk: (chunk: string) => void;
}): Promise<void> => {
  // TODO: Implement streaming in Phase 5 for real-time UI updates
  throw new Error('Streaming not yet implemented');
};
