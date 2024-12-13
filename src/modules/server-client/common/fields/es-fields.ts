export enum EsColumnEnum {
  //-------基本数据类型--------
  //用于全文搜索的字符串字段。会经过分析器处理，适合用于需要进行分词、模糊匹配等操作的文本。
  text = 'text',
  //不会被分析的字符串字段。适合用于过滤、排序和聚合操作，如用户ID、状态码等。
  keyword = 'keyword',
  //分别对应整数（32位）、长整数（64位）、浮点数（32位）和双精度浮点数（64位）。用于数值型数据。
  integer = 'integer',
  long = 'long',
  float = 'float',
  double = 'double',
  //存储布尔值 true 或 false。
  boolean = 'boolean',
  //用于日期时间类型的字段，支持多种格式，例如 ISO8601 格式的日期字符串。
  date = 'date',
  //以 Base64 编码的形式存储二进制数据。
  binary = 'binary',
  //用于 IPv4 和 IPv6 地址的字段。
  ip = 'ip',
  //包括 integer_range, float_range, long_range, double_range, date_range, ip_range 等，用于表示一个范围。
  range = 'range',

  //------复杂数据类型-------------
  //允许在文档中嵌套对象。每个子字段都可以有自己的数据类型。
  object = 'object',
  //类似于 object，但可以对嵌套的对象进行精确的查询。每个嵌套的对象都被独立索引，从而允许更复杂的查询逻辑。
  nested = 'nested',
  //用于地理坐标点，支持地理位置相关的查询和聚合。
  geo_point = 'geo_point',
  //用于复杂地理形状（如多边形），支持高级的空间查询。
  geo_shape = 'geo_shape',

  //---------特殊数据类型----------------
  //用于自动完成建议功能，提高搜索体验。
  completion = 'completion',
  //已被弃用，曾用于存储哈希值。
  murmur3 = 'murmur3',
  //基于文本字段生成的计数器，统计文本字段中的词汇数量。
  token_count = 'token_count',
  //用于增强机器学习评分模型的功能特性。
  rank_feature = 'rank_feature',
  rank_features = 'rank_features',
  //用于向量化的数据，如机器学习算法产生的特征向量。
  dense_vector = 'dense_vector',
  sparse_vector = 'sparse_vector',
  //用于将 JSON 对象扁平化为键值对，适用于结构不确定或高度动态的文档。
  flattened = 'flattened',
}


