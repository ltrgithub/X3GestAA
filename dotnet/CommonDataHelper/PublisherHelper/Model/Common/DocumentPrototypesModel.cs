using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PublisherHelper.Model.Common
{
    public class DocumentPrototypesModel
    {
        [JsonProperty("$links")]
        public SavePrototypesModel links;
    }
}
