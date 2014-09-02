using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.CompanyHelper.Model
{
    public class CompanysModel
    {
        [JsonProperty("$resources")]
        public List<CompanyModel> companies { get; set; }
    }
}
