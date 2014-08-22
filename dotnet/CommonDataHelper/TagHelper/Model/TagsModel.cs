using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.SyracuseTagHelper.Model
{
    public class TagsModel
    {
        [JsonProperty("$resources")]
        public List<object> tags { get; set; }
    }
}
