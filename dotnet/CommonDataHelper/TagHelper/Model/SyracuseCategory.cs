using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.TagHelper.Model
{
    public class SyracuseCategory
    {
        [JsonProperty("$uuid")]
        public String uuid;

        [JsonProperty("description")]
        public String description;
    }
}
