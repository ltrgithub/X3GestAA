using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PublisherHelper.Model.Word
{
    public class WordDocumentPrototypes
    {
        [JsonProperty("$links")]
        public WordSavePrototypes links;
    }
}
