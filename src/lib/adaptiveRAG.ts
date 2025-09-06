import { openai } from './openai';
import { QueryAnalysis, ContextChunk, EnhancedAnswer } from './advancedQA';

// Adaptive Retrieval Strategy Selection
export interface AdaptiveRetrievalStrategy {
  strategy: 'simple' | 'multi_stage' | 'knowledge_graph' | 'multimodal' | 'expert_domain';
  confidence: number;
  reasoning: string;
  parameters: {
    stages?: number;
    graphDepth?: number;
    domainFocus?: string;
    modalityTypes?: string[];
  };
}

// Knowledge Graph Entity
export interface KnowledgeGraphEntity {
  id: string;
  name: string;
  type: string;
  properties: Record<string, any>;
  relationships: {
    target: string;
    relation: string;
    strength: number;
  }[];
}

// Enhanced Context with Metadata
export interface EnhancedContext extends ContextChunk {
  metadata: {
    documentType: 'text' | 'image' | 'table' | 'chart' | 'code';
    trustworthiness: number; // 0-1 score
    recency: number; // days since creation/update
    authority: number; // source authority score
    complexity: number; // content complexity score
    relationships: string[]; // related entity IDs
    semanticTags: string[];
    extractedEntities: KnowledgeGraphEntity[];
    multimodalData?: {
      imageUrl?: string;
      chartData?: any;
      tableStructure?: any;
    };
  };
}

// Multi-Stage Retrieval Pipeline
export class AdaptiveRetrievalEngine {
  private userProfile: UserProfile;
  private knowledgeGraph: Map<string, KnowledgeGraphEntity> = new Map();
  
  constructor(userId: string) {
    this.userProfile = this.loadUserProfile(userId);
    this.initializeKnowledgeGraph();
  }

  // 1. Adaptive Strategy Selection with RL-like approach
  async selectRetrievalStrategy(query: QueryAnalysis): Promise<AdaptiveRetrievalStrategy> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'system',
          content: `You are an adaptive retrieval strategist. Based on the query analysis, select the optimal retrieval strategy:

          STRATEGIES:
          - simple: Basic semantic search (fast, basic queries)
          - multi_stage: Multi-hop retrieval (complex research queries)
          - knowledge_graph: Entity-relationship based (factual, interconnected queries)
          - multimodal: Cross-modal retrieval (visual/data questions)
          - expert_domain: Domain-specialized retrieval (technical, specialized queries)

          Consider:
          - Query complexity and intent
          - Required accuracy vs speed
          - Data types needed
          - Domain specificity
          
          Return JSON with strategy, confidence (0-1), reasoning, and parameters.`
        }, {
          role: 'user',
          content: `Query Analysis:
          - Original: "${query.originalQuery}"
          - Intent: ${query.intent}
          - Entities: ${query.entities.join(', ')}
          - Confidence: ${query.confidence}
          - Keywords: ${query.keywords.join(', ')}`
        }],
        temperature: 0.2,
        max_tokens: 400,
      });

      const strategy = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        strategy: strategy.strategy || 'simple',
        confidence: strategy.confidence || 0.7,
        reasoning: strategy.reasoning || 'Default strategy selection',
        parameters: strategy.parameters || {}
      };
    } catch (error) {
      console.error('Strategy selection failed:', error);
      return {
        strategy: 'simple',
        confidence: 0.5,
        reasoning: 'Fallback to simple strategy due to error',
        parameters: {}
      };
    }
  }

  // 2. Multi-Stage Retrieval Implementation
  async performMultiStageRetrieval(
    query: QueryAnalysis, 
    strategy: AdaptiveRetrievalStrategy,
    userId: string
  ): Promise<EnhancedContext[]> {
    const stages = strategy.parameters.stages || 3;
    let contexts: EnhancedContext[] = [];
    let currentQuery = query.expandedQuery;

    console.log(`🔄 Multi-stage retrieval with ${stages} stages`);

    for (let stage = 0; stage < stages; stage++) {
      console.log(`📍 Stage ${stage + 1}: "${currentQuery}"`);

      // Stage-specific retrieval
      const stageResults = await this.retrieveForStage(currentQuery, userId, stage, contexts);
      
      // Filter and deduplicate
      const newContexts = this.filterAndDeduplicate(stageResults, contexts);
      contexts.push(...newContexts);

      // Generate refined query for next stage
      if (stage < stages - 1) {
        currentQuery = await this.generateRefinedQuery(query.originalQuery, contexts);
      }

      // Early stopping if we have enough high-quality contexts
      if (contexts.length >= 10 && this.calculateAvgConfidence(contexts) > 0.8) {
        console.log(`✅ Early stopping at stage ${stage + 1} - sufficient quality reached`);
        break;
      }
    }

    return this.rankContextsByRelevance(contexts, query);
  }

  // 3. Knowledge Graph Enhanced Retrieval
  async performKnowledgeGraphRetrieval(
    query: QueryAnalysis,
    strategy: AdaptiveRetrievalStrategy,
    userId: string
  ): Promise<EnhancedContext[]> {
    const graphDepth = strategy.parameters.graphDepth || 2;
    
    // Extract entities from query
    const queryEntities = await this.extractAndMapEntities(query);
    console.log(`🕸️ Knowledge Graph Retrieval - Found entities:`, queryEntities.map(e => e.name));

    let allContexts: EnhancedContext[] = [];
    
    for (const entity of queryEntities) {
      // Get related entities through knowledge graph traversal
      const relatedEntities = this.traverseKnowledgeGraph(entity, graphDepth);
      
      // Retrieve contexts for entity and related entities
      const entityContexts = await this.retrieveEntityContexts(entity, relatedEntities, userId);
      allContexts.push(...entityContexts);
    }

    // Enhance contexts with relationship information
    return this.enrichContextsWithRelationships(allContexts, queryEntities);
  }

  // 4. Multimodal Data Integration
  async performMultimodalRetrieval(
    query: QueryAnalysis,
    userId: string
  ): Promise<EnhancedContext[]> {
    console.log('🎨 Multimodal retrieval activated');

    // Determine required modalities
    const requiredModalities = this.detectRequiredModalities(query);
    console.log('Required modalities:', requiredModalities);

    const contexts: EnhancedContext[] = [];

    // Text retrieval
    if (requiredModalities.includes('text')) {
      const textContexts = await this.retrieveTextualContexts(query, userId);
      contexts.push(...textContexts);
    }

    // Image/Chart retrieval (if visual elements detected)
    if (requiredModalities.includes('visual')) {
      const visualContexts = await this.retrieveVisualContexts(query, userId);
      contexts.push(...visualContexts);
    }

    // Structured data retrieval (tables, datasets)
    if (requiredModalities.includes('structured')) {
      const structuredContexts = await this.retrieveStructuredContexts(query, userId);
      contexts.push(...structuredContexts);
    }

    return this.fuseMultimodalContexts(contexts, query);
  }

  // 5. Query and Prompt Enhancement with Compression
  async enhanceAndCompressPrompt(
    contexts: EnhancedContext[],
    query: QueryAnalysis,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    // Remove low-relevance contexts
    const filteredContexts = contexts.filter(ctx => ctx.score > 0.4);
    
    // Compress and summarize contexts
    const compressedContexts = await this.compressContexts(filteredContexts);
    
    // Build enhanced prompt with metadata
    const enhancedPrompt = this.buildEnhancedPrompt(
      compressedContexts, 
      query, 
      conversationHistory
    );

    console.log(`🗜️ Prompt compressed from ${contexts.length} to ${filteredContexts.length} contexts`);
    return enhancedPrompt;
  }

  // 6. Embedding Metadata Enhancement
  private enrichContextsWithMetadata(contexts: ContextChunk[]): EnhancedContext[] {
    return contexts.map(ctx => ({
      ...ctx,
      metadata: {
        documentType: this.detectDocumentType(ctx.text),
        trustworthiness: this.calculateTrustworthiness(ctx),
        recency: this.calculateRecency(ctx),
        authority: this.calculateAuthority(ctx),
        complexity: this.calculateComplexity(ctx.text),
        relationships: this.extractRelationships(ctx),
        semanticTags: this.extractSemanticTags(ctx.text),
        extractedEntities: this.extractEntitiesFromContext(ctx)
      }
    }));
  }

  // Helper Methods
  private loadUserProfile(userId: string): UserProfile {
    // Load user preferences, domain expertise, query patterns
    return {
      id: userId,
      expertiseDomains: [],
      queryPatterns: [],
      preferredSources: [],
      trustThreshold: 0.6
    };
  }

  private initializeKnowledgeGraph(): void {
    // Initialize with domain-specific knowledge graphs
    // In production: load from Neo4j, Amazon Neptune, etc.
    console.log('🕸️ Knowledge graph initialized');
  }

  private async retrieveForStage(
    query: string, 
    userId: string, 
    stage: number, 
    existingContexts: EnhancedContext[]
  ): Promise<EnhancedContext[]> {
    // Stage-specific retrieval logic
    // Stage 0: Broad semantic search
    // Stage 1: Focused search based on initial findings
    // Stage 2: Gap-filling search for missing information
    
    const contexts = await this.performSemanticSearch(query, userId);
    return this.enrichContextsWithMetadata(contexts);
  }

  private filterAndDeduplicate(newContexts: EnhancedContext[], existingContexts: EnhancedContext[]): EnhancedContext[] {
    return newContexts.filter(newCtx => 
      !existingContexts.some(existing => 
        this.calculateSimilarity(newCtx.text, existing.text) > 0.8
      )
    );
  }

  private async generateRefinedQuery(originalQuery: string, contexts: EnhancedContext[]): Promise<string> {
    const contextSummary = contexts.slice(0, 3)
      .map(ctx => ctx.text.substring(0, 100))
      .join(' | ');

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: 'Generate a refined search query to find additional relevant information based on the original query and found contexts. Be specific and focused.'
        }, {
          role: 'user',
          content: `Original: ${originalQuery}\nFound contexts: ${contextSummary}\nRefined query:`
        }],
        temperature: 0.3,
        max_tokens: 100,
      });

      return response.choices[0].message.content || originalQuery;
    } catch (error) {
      return originalQuery;
    }
  }

  private calculateAvgConfidence(contexts: EnhancedContext[]): number {
    return contexts.reduce((sum, ctx) => sum + ctx.score, 0) / contexts.length;
  }

  private async extractAndMapEntities(query: QueryAnalysis): Promise<KnowledgeGraphEntity[]> {
    // Map query entities to knowledge graph entities
    return query.entities.map(entityName => ({
      id: `entity_${entityName.toLowerCase().replace(/\s+/g, '_')}`,
      name: entityName,
      type: 'concept',
      properties: {},
      relationships: []
    }));
  }

  private traverseKnowledgeGraph(entity: KnowledgeGraphEntity, depth: number): KnowledgeGraphEntity[] {
    // Traverse knowledge graph to find related entities
    const related: KnowledgeGraphEntity[] = [];
    // Implementation would traverse actual knowledge graph
    return related;
  }

  private async retrieveEntityContexts(
    entity: KnowledgeGraphEntity, 
    relatedEntities: KnowledgeGraphEntity[],
    userId: string
  ): Promise<EnhancedContext[]> {
    // Retrieve contexts related to specific entities
    const allEntities = [entity, ...relatedEntities];
    const contexts: EnhancedContext[] = [];
    
    for (const ent of allEntities) {
      const entityContexts = await this.performSemanticSearch(ent.name, userId);
      contexts.push(...this.enrichContextsWithMetadata(entityContexts));
    }
    
    return contexts;
  }

  private enrichContextsWithRelationships(
    contexts: EnhancedContext[], 
    queryEntities: KnowledgeGraphEntity[]
  ): EnhancedContext[] {
    return contexts.map(ctx => ({
      ...ctx,
      metadata: {
        ...ctx.metadata,
        relationships: queryEntities.map(e => e.id),
        extractedEntities: queryEntities
      }
    }));
  }

  private detectRequiredModalities(query: QueryAnalysis): string[] {
    const modalities = ['text']; // Always include text
    
    const visualKeywords = ['image', 'chart', 'graph', 'diagram', 'picture', 'visual', 'plot'];
    const structuredKeywords = ['table', 'data', 'statistics', 'numbers', 'dataset'];
    
    if (visualKeywords.some(kw => query.originalQuery.toLowerCase().includes(kw))) {
      modalities.push('visual');
    }
    
    if (structuredKeywords.some(kw => query.originalQuery.toLowerCase().includes(kw))) {
      modalities.push('structured');
    }
    
    return modalities;
  }

  private async performSemanticSearch(query: string, userId: string): Promise<ContextChunk[]> {
    try {
      // Import and use the existing vector store
      const { vectorStore } = await import('./vector-store');
      const { generateEmbedding } = await import('./openai');
      
      // Generate embedding for the query
      const queryEmbedding = await generateEmbedding(query);
      
      // Search across all available documents for this user
      const availableDocs = await vectorStore.getAllDocuments();
      const results: ContextChunk[] = [];
      
      for (const docId of availableDocs) {
        const chunks = await vectorStore.searchSimilar(queryEmbedding, docId, 5);
        results.push(...chunks.map(chunk => ({
          text: chunk.content,
          score: chunk.similarity || 0.7,
          documentId: docId,
          chunkIndex: 0,
          metadata: chunk.metadata || {}
        })));
      }
      
      // Sort by relevance and return top results
      return results.sort((a, b) => b.score - a.score).slice(0, 10);
    } catch (error) {
      console.error('Semantic search failed:', error);
      return [];
    }
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity - replace with more sophisticated method
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // Additional helper methods...
  private detectDocumentType(text: string): 'text' | 'image' | 'table' | 'chart' | 'code' {
    if (text.includes('```') || text.includes('function') || text.includes('class')) return 'code';
    if (text.includes('|') && text.split('\n').some(line => line.split('|').length > 2)) return 'table';
    return 'text';
  }

  private calculateTrustworthiness(ctx: ContextChunk): number {
    // Implementation would analyze source credibility, citations, etc.
    return 0.8;
  }

  private calculateRecency(ctx: ContextChunk): number {
    // Days since creation/update
    return 30;
  }

  private calculateAuthority(ctx: ContextChunk): number {
    // Source authority score
    return 0.7;
  }

  private calculateComplexity(text: string): number {
    // Text complexity analysis
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    return Math.min(words / sentences / 10, 1); // Normalized complexity
  }

  private extractRelationships(ctx: ContextChunk): string[] {
    // Extract entity relationships from context
    return [];
  }

  private extractSemanticTags(text: string): string[] {
    // Extract semantic tags from text
    return [];
  }

  private extractEntitiesFromContext(ctx: ContextChunk): KnowledgeGraphEntity[] {
    // Extract and map entities from context
    return [];
  }

  private rankContextsByRelevance(contexts: EnhancedContext[], query: QueryAnalysis): EnhancedContext[] {
    return contexts.sort((a, b) => {
      // Multi-factor ranking: relevance, trustworthiness, recency, authority
      const scoreA = (a.score * 0.4) + (a.metadata.trustworthiness * 0.3) + 
                    (a.metadata.authority * 0.2) + (Math.max(0, 1 - a.metadata.recency/365) * 0.1);
      const scoreB = (b.score * 0.4) + (b.metadata.trustworthiness * 0.3) + 
                    (b.metadata.authority * 0.2) + (Math.max(0, 1 - b.metadata.recency/365) * 0.1);
      return scoreB - scoreA;
    });
  }

  private async retrieveTextualContexts(query: QueryAnalysis, userId: string): Promise<EnhancedContext[]> {
    const contexts = await this.performSemanticSearch(query.expandedQuery, userId);
    return this.enrichContextsWithMetadata(contexts);
  }

  private async retrieveVisualContexts(query: QueryAnalysis, userId: string): Promise<EnhancedContext[]> {
    // Retrieve visual/chart contexts
    return [];
  }

  private async retrieveStructuredContexts(query: QueryAnalysis, userId: string): Promise<EnhancedContext[]> {
    // Retrieve structured data contexts
    return [];
  }

  private fuseMultimodalContexts(contexts: EnhancedContext[], query: QueryAnalysis): EnhancedContext[] {
    // Fuse different modalities into coherent context set
    return contexts;
  }

  private async compressContexts(contexts: EnhancedContext[]): Promise<EnhancedContext[]> {
    // Compress redundant information while preserving key details
    return contexts.slice(0, 6); // Simple truncation for now
  }

  private buildEnhancedPrompt(
    contexts: EnhancedContext[], 
    query: QueryAnalysis,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): string {
    const contextWithMetadata = contexts.map((ctx, i) => 
      `[Source ${i + 1}] (Trust: ${(ctx.metadata.trustworthiness * 100).toFixed(0)}%, Authority: ${(ctx.metadata.authority * 100).toFixed(0)}%)\n${ctx.text}`
    ).join('\n\n');

    return `Context with enhanced metadata:\n${contextWithMetadata}\n\nQuery: ${query.originalQuery}`;
  }
}

interface UserProfile {
  id: string;
  expertiseDomains: string[];
  queryPatterns: string[];
  preferredSources: string[];
  trustThreshold: number;
}